import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { CLI_BRANDING } from '../cli.config';
import { ParsedGitHubUrl, GitHubEntry } from '../types';

/**
 * Parse a GitHub URL into its components.
 * Supports: https://github.com/owner/repo/tree/branch/path
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
    }

    const regex = /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?/;
    const match = normalizedUrl.match(regex);

    if (!match) {
        return null;
    }

    const [, owner, repo, branch = 'main', pathInRepo = ''] = match;

    let apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    if (pathInRepo) {
        apiUrl += `/${pathInRepo}`;
    }
    if (branch !== 'main') {
        apiUrl += `?ref=${branch}`;
    }

    return {
        owner,
        repo: repo.replace(/\.git$/, ''),
        branch,
        pathInRepo,
        apiUrl,
    };
}

/**
 * Make an HTTPS GET request and return JSON.
 */
function fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': CLI_BRANDING.user_agent,
                Accept: 'application/vnd.github.v3+json',
            },
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(new Error(`Failed to parse JSON from ${url}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Download a file from a URL.
 */
function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const file = fs.createWriteStream(destPath);

        https.get(url, { headers: { 'User-Agent': CLI_BRANDING.user_agent } }, (res) => {
            // Handle redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
                const redirectUrl = res.headers.location;
                if (redirectUrl) {
                    downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                    return;
                }
            }

            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { }); // Clean up
            reject(err);
        });
    });
}

/**
 * Recursively download all files from a GitHub directory.
 * Optimized with parallel downloads and progress reporting.
 */
export async function downloadFromGitHub(
    apiUrl: string,
    targetDir: string,
    onProgress?: (downloaded: number, total: number, lastFile: string) => void
): Promise<number> {
    const allFiles: { url: string; path: string; name: string }[] = [];

    const IGNORED_FILES = new Set([
        '.ds_store',
        'thumbs.db',
        '.git',
        '.github',
        '.vscode',
        '.idea',
        'node_modules',
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'bun.lockb',
        '.gitignore',
        '.npmrc',
        'eslint.config.mjs',
        'eslint.config.js',
        '.eslintrc.js',
        '.eslintrc.json',
        '.prettierrc',
        '.prettierrc.json',
        '.prettierrc.js',
        'tsconfig.json',
        'sync-skills.sh',
        'versions.json'
    ]);

    function shouldIgnore(name: string): boolean {
        return IGNORED_FILES.has(name.toLowerCase());
    }

    // 1. Collect all files recursively
    async function collect(url: string, currentTargetDir: string) {
        const entries = await fetchJson<GitHubEntry[] | { message: string }>(url);

        if (!Array.isArray(entries)) {
            // Check for rate limit or other API errors
            const errorResponse = entries as { message: string };
            if (errorResponse.message && errorResponse.message.includes('API rate limit')) {
                throw new Error('GitHub API rate limit exceeded.\nTo increase limits, authenticate using:\n  • export GITHUB_TOKEN=your_token (Linux/Mac)\n  • set GITHUB_TOKEN=your_token (Windows)\n  • Or pass --token your_token to the command');
            }

            const entry = entries as unknown as GitHubEntry;
            if (entry.download_url && !shouldIgnore(entry.name)) {
                allFiles.push({
                    url: entry.download_url,
                    path: path.join(currentTargetDir, entry.name),
                    name: entry.name
                });
            }
            return;
        }

        for (const entry of entries) {
            if (shouldIgnore(entry.name)) continue;

            if (entry.type === 'file' && entry.download_url) {
                allFiles.push({
                    url: entry.download_url,
                    path: path.join(currentTargetDir, entry.name),
                    name: entry.name
                });
            } else if (entry.type === 'dir') {
                await collect(entry.url, path.join(currentTargetDir, entry.name));
            }
        }
    }

    await collect(apiUrl, targetDir);

    if (allFiles.length === 0) return 0;

    // 2. Download files in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 5;
    let downloadedCount = 0;
    const totalCount = allFiles.length;

    const downloadQueue = [...allFiles];
    const workers = Array(Math.min(CONCURRENCY_LIMIT, totalCount)).fill(null).map(async () => {
        while (downloadQueue.length > 0) {
            const file = downloadQueue.shift();
            if (!file) break;

            await downloadFile(file.url, file.path);
            downloadedCount++;
            onProgress?.(downloadedCount, totalCount, file.name);
        }
    });

    await Promise.all(workers);
    return downloadedCount;
}

/**
 * Fetch repository metadata (stars, forks, description)
 */
export async function getRepoMetadata(owner: string, repo: string) {
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}`;
        const data = await fetchJson<any>(url);
        return {
            stars: data.stargazers_count,
            forks: data.forks_count,
            description: data.description,
            owner_name: data.owner.login,
            repo_name: data.name
        };
    } catch (e) {
        return null;
    }
}

/**
 * Install a skill from a GitHub URL to a local directory.
 */
export async function installSkillFromUrl(
    githubUrl: string,
    folderName: string,
    baseDir: string = '.',
    options?: { cursor?: boolean; onProgress?: (downloaded: number, total: number, lastFile: string) => void }
): Promise<{ success: boolean; filesInstalled: number; targetDir: string }> {
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
        throw new Error(`Invalid GitHub URL: ${githubUrl}`);
    }

    // Install to the primary skills directory (e.g. .agent/skills or .claude/skills)
    const agentSkillsDir = path.join(baseDir, 'skills', folderName);
    const filesInstalled = await downloadFromGitHub(parsed.apiUrl, agentSkillsDir, options?.onProgress);

    // Optionally also install to .cursor/rules/
    if (options?.cursor) {
        // Project-specific .cursor/rules logic
        const cursorDir = path.join(baseDir, '.cursor', 'rules', folderName);
        await downloadFromGitHub(parsed.apiUrl, cursorDir, options?.onProgress);
    }

    return {
        success: true,
        filesInstalled,
        targetDir: agentSkillsDir,
    };
}

/**
 * List all skills available in a GitHub repository.
 * Searches for folders containing SKILL.md.
 */
export async function listSkillsInRepo(githubUrl: string): Promise<{ name: string; path: string; skillMdUrl: string }[]> {
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) return [];

    const skills: { name: string; path: string; skillMdUrl: string }[] = [];

    async function scan(url: string) {
        try {
            const entries = await fetchJson<GitHubEntry[]>(url);
            if (!Array.isArray(entries)) return;

            for (const entry of entries) {
                if (entry.type === 'file' && entry.name === 'SKILL.md') {
                    // Found a skill! The name is the parent folder's name or repo name
                    const dirName = path.dirname(entry.path) === '.' ? parsed?.repo : path.basename(path.dirname(entry.path));
                    skills.push({
                        name: dirName || '',
                        path: path.dirname(entry.path),
                        skillMdUrl: entry.download_url || ''
                    });
                } else if (entry.type === 'dir' && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    await scan(entry.url);
                }
            }
        } catch (e) {
            // Error scanning, ignore
        }
    }

    await scan(parsed.apiUrl);
    return skills;
}
