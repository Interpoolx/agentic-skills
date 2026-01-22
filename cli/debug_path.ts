
import * as path from 'path';
import * as fs from 'fs';

function findProjectRoot(startDir: string = process.cwd()): string {
    let current = path.resolve(startDir);
    const root = path.parse(current).root;

    console.log(`Starting findProjectRoot from: ${current}`);
    console.log(`Root is: ${root}`);

    // 1. Prioritize .git (Workspace Root)
    let gitSearch = current;
    while (gitSearch !== root) {
        const gitPath = path.join(gitSearch, '.git');
        console.log(`Checking for .git at: ${gitPath}`);
        if (fs.existsSync(gitPath)) {
            console.log(`Found .git at: ${gitSearch}`);
            return gitSearch;
        }
        gitSearch = path.dirname(gitSearch);
    }
    console.log(`Reached root without finding .git`);

    return path.resolve(startDir);
}

function parseGitHubUrl(url: string) {
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
    return { owner, repo: repo.replace(/\.git$/, '') };
}

// Test findProjectRoot
const root = findProjectRoot('d:\\react-projects\\agentic-skills\\cli');
console.log(`Result Root: ${root}`);

// Test parseGitHubUrl
const url = 'https://github.com/onmax/nuxt-skills/tree/main/skills/nuxthub';
const parsed = parseGitHubUrl(url);
console.log(`Parsed Repo: ${parsed?.repo}`);
