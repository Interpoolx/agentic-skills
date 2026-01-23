import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { findSkill, loadRegistry, isSkillInstalled, findProjectRoot, resolveSkill } from '../utils/registry';
import { installSkillFromUrl, parseGitHubUrl, listSkillsInRepo } from '../utils/downloader';
import {
    parseGitHubAuthUrl,
    loadGitHubToken,
    promptForGitAuth,
    setupGitEnvironment,
    GitAuthOptions,
    PrivateRepoConfig
} from '../utils/git-auth';
import { CLI_BRANDING } from '../cli.config';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { showBanner } from '../utils/banner';
import { detectInstalledAgents } from '../utils/agent-detector';

interface InstallOptions {
    dir?: string;
    cursor?: boolean;
    universal?: boolean;
    global?: boolean;
    symlink?: boolean;
    yes?: boolean;
    token?: string;
    sshKey?: string;
    private?: boolean;
    native?: boolean;
    skill?: string;
}

/**
 * Install a skill by name, GitHub URL, or local path.
 */
export async function installSkill(skillNameOrUrl: string, options: InstallOptions): Promise<void> {
    if (!options.yes) {
        return runInteractiveInstall(skillNameOrUrl, options);
    }

    try {
        const isUrl = skillNameOrUrl.includes('github.com') || skillNameOrUrl.startsWith('http');
        const isLocalPath = !isUrl && (skillNameOrUrl.startsWith('.') || skillNameOrUrl.startsWith('/') || skillNameOrUrl.includes('\\'));

        // Determine target directory
        const projectRoot = findProjectRoot();
        let targetBaseDir = projectRoot;

        if (options.global) {
            targetBaseDir = path.join(os.homedir(), `.${CLI_BRANDING.brand_lower_name}`);
        } else if (options.universal) {
            targetBaseDir = path.join(projectRoot, '.agent');
        } else {
            // Default to project-local (.claude/skills or .agent/skills)
            targetBaseDir = fs.existsSync(path.join(projectRoot, '.agent'))
                ? path.join(projectRoot, '.agent')
                : path.join(projectRoot, '.claude');
        }

        const skillsDir = path.join(targetBaseDir, 'skills');

        if (isLocalPath) {
            await installFromLocal(skillNameOrUrl, skillsDir, options);
        } else if (isUrl) {
            await installFromUrl(skillNameOrUrl, skillsDir, options);
        } else {
            // Check for owner/repo format (e.g. "remotion-dev/skills" or "owner/repo")
            const isOwnerRepo = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_\.]+$/.test(skillNameOrUrl);

            if (isOwnerRepo) {
                console.log(chalk.cyan(`\n🔍 Resolving skill "${skillNameOrUrl}"...`));
                const [owner, repo] = skillNameOrUrl.split('/');
                const resolved = await resolveSkill(owner, repo, options.skill);

                if (resolved && (resolved.skill || (resolved.skills && resolved.skills.length > 0))) {
                    let targetUrl = '';

                    if (resolved.skill) {
                        targetUrl = resolved.skill.githubUrl || resolved.skill.url;
                        console.log(chalk.green(`✓ Found skill: ${pc.bold(resolved.skill.name)}`));
                    } else if (resolved.skills) {
                        if (resolved.skills.length === 1) {
                            targetUrl = resolved.skills[0].githubUrl || resolved.skills[0].url;
                            console.log(chalk.green(`✓ Found skill: ${pc.bold(resolved.skills[0].name)}`));
                        } else {
                            // Prompt selection
                            const selectedPaths = await p.multiselect({
                                message: 'Select skills to install:',
                                options: resolved.skills.map((s: any) => ({
                                    value: s.githubUrl || s.url,
                                    label: pc.bold(s.name),
                                    hint: s.shortDescription || s.description
                                })),
                                required: true
                            });

                            if (p.isCancel(selectedPaths)) {
                                p.cancel('Installation cancelled');
                                return;
                            }

                            // Handle multiple selection by installing sequentially
                            // Note: installFromUrl is designed for single URL mostly, but we can loop
                            const selectedUrls = selectedPaths as string[];

                            // If only one selected, proceed normally
                            if (selectedUrls.length === 1) {
                                targetUrl = selectedUrls[0];
                            } else {
                                // Loop install
                                for (const url of selectedUrls) {
                                    await installFromUrl(url, skillsDir, options);
                                }
                                return; // Done
                            }
                        }
                    }

                    if (targetUrl) {
                        await installFromUrl(targetUrl, skillsDir, options);
                        return;
                    }
                } else {
                    console.log(chalk.yellow(`\n⚠️ Could not resolve via API. Falling back to GitHub...`));
                    await installFromUrl(`https://github.com/${skillNameOrUrl}`, skillsDir, options);
                    return;
                }
            }

            await installFromRegistry(skillNameOrUrl, skillsDir, options);
        }

        // NEW: Handle native install if requested
        if (options.native) {
            console.log(chalk.cyan('\n🚀 Performing native install to AI agents...'));
            const { exportToAgents } = await import('./export-agents');
            await exportToAgents({ all: true, yes: true });
        }
    } catch (err: any) {
        console.error(chalk.red(`\n❌ Installation failed: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
    }
}

/**
 * Interactive onboarding flow for installation.
 */
async function runInteractiveInstall(skillNameOrUrl: string, options: InstallOptions): Promise<void> {
    p.intro(pc.cyan(pc.bold(`Installing Skill: ${skillNameOrUrl}`)));

    const isUrl = skillNameOrUrl.includes('github.com') || skillNameOrUrl.startsWith('http');
    let finalInstallUrl = skillNameOrUrl;

    if (isUrl && !options.skill) {
        const spinner = p.spinner();
        spinner.start('Scanning repository for skills...');
        const repoSkills = await listSkillsInRepo(skillNameOrUrl);

        if (repoSkills.length > 0) {
            spinner.stop(`Found ${repoSkills.length} skill(s) in repository`);

            if (repoSkills.length === 1) {
                p.log.info(`Found skill: ${pc.bold(repoSkills[0].name)}`);
            } else {
                const selectedPaths = await p.multiselect({
                    message: 'Select skills to install:',
                    options: repoSkills.map(s => ({
                        value: s.path,
                        label: pc.bold(s.name),
                        hint: `path: ${s.path}`
                    })),
                    required: true
                });

                if (p.isCancel(selectedPaths)) {
                    p.cancel('Installation cancelled');
                    return;
                }

                // For simplicity in this flow, we'll install one by one or 
                // handle the first one and notify user. 
                // Industry standard usually handles the primary one or prompts.
                // We'll update finalInstallUrl for the first selected and process.
                const firstSkill = repoSkills.find(s => s.path === (selectedPaths as string[])[0]);
                if (firstSkill) {
                    const parsed = parseGitHubUrl(skillNameOrUrl);
                    if (parsed) {
                        finalInstallUrl = `https://github.com/${parsed.owner}/${parsed.repo}/tree/${parsed.branch}/${firstSkill.path}`;
                    }
                }
            }
        } else {
            spinner.stop('No skills found in root directory.');
        }
    }

    // Detect agents
    const projectRoot = findProjectRoot();
    const detection = detectInstalledAgents(projectRoot);
    const detectedAgents = detection.agents.filter(a => a.detected);

    if (detectedAgents.length === 0) {
        p.log.warn('No AI agents detected on your system.');
    } else {
        p.log.info(pc.dim(`Detected ${detectedAgents.length} agents: ${detectedAgents.map(a => a.name).join(', ')}`));
    }

    // 1. Select agents to install to
    const agentTargets = await p.multiselect({
        message: 'Select agents to install skills to:',
        options: [
            { value: 'universal', label: 'Universal (.agent/skills)', hint: 'Single source of truth (recommended)' },
            ...detectedAgents.map(a => ({
                value: a.id,
                label: `${a.icon} ${a.name}`,
                hint: a.skillsPath
            }))
        ],
        required: true,
        initialValues: ['universal']
    });

    if (p.isCancel(agentTargets)) {
        p.cancel('Installation cancelled');
        return;
    }

    // 2. Installation scope
    const scope = await p.select({
        message: 'Installation scope',
        options: [
            { value: 'project', label: 'Project', hint: 'Current directory' },
            { value: 'global', label: 'Global', hint: `~/.${CLI_BRANDING.brand_lower_name}/skills` }
        ]
    });

    if (p.isCancel(scope)) {
        p.cancel('Installation cancelled');
        return;
    }

    // 3. Installation method
    const method = await p.select({
        message: 'Installation method',
        options: [
            { value: 'symlink', label: pc.green('Symlink (Recommended)'), hint: 'Single source of truth, easy updates' },
            { value: 'copy', label: 'Copy to all agents' }
        ]
    });

    if (p.isCancel(method)) {
        p.cancel('Installation cancelled');
        return;
    }

    // Final confirmation
    const confirm = await p.confirm({
        message: 'Proceed with installation?',
        initialValue: true
    });

    if (p.isCancel(confirm) || !confirm) {
        p.cancel('Installation cancelled');
        return;
    }

    const spinner = p.spinner();
    spinner.start('Installing...');

    try {
        const finalOptions: InstallOptions = {
            ...options,
            yes: true,
            universal: (agentTargets as string[]).includes('universal'),
            global: scope === 'global',
            symlink: method === 'symlink',
            native: (agentTargets as string[]).some(t => t !== 'universal')
        };

        // If universal is NOT selected but other agents are, we need to pick a base directory
        await installSkill(finalInstallUrl, finalOptions);

        spinner.stop(pc.green('✅ Installation complete!'));
        p.outro(pc.cyan(pc.bold('Done! Happy coding! ◝(ᵔᵕᵔ)◜')));
    } catch (err: any) {
        spinner.stop(pc.red(`❌ Installation failed: ${err instanceof Error ? err.message : String(err)}`));
    }
}

async function installFromLocal(localPath: string, skillsDir: string, options: InstallOptions) {
    const sourcePath = path.resolve(localPath);
    if (!fs.existsSync(sourcePath)) {
        console.error(chalk.red(`\n❌ Local path not found: ${localPath}`));
        process.exit(1);
    }

    const folderName = path.basename(sourcePath);
    const targetPath = path.join(skillsDir, folderName);

    if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });

    console.log(chalk.gray(`Installing from: ${localPath}`));

    if (options.symlink) {
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        fs.symlinkSync(sourcePath, targetPath, 'junction');
        console.log(chalk.green(`\n✅ Symlinked: ${folderName}`));
    } else {
        fs.cpSync(sourcePath, targetPath, { recursive: true });
        console.log(chalk.green(`\n✅ Copied: ${folderName}`));
    }
}

async function installFromUrl(url: string, skillsDir: string, options: InstallOptions) {
    let auth: GitAuthOptions | undefined;

    // Check if this is a private repository
    const isPrivateRepo = options.private ||
        url.includes('.git') ||
        url.includes('private') ||
        url.includes('git@');

    if (isPrivateRepo) {
        // Get authentication credentials
        const credentials = await getAuthCredentials(url, options);
        if (!credentials) {
            console.log(chalk.red('\n❌ Authentication required for private repository'));
            process.exit(1);
        }
        auth = credentials;
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
        console.log(chalk.red('✗ Invalid GitHub URL'));
        process.exit(1);
    }

    const folderName = generateFolderName(parsed.owner, parsed.repo, parsed.pathInRepo);

    // If no pathInRepo, try to find a 'skills' folder or the first skill
    let finalUrl = url;
    if (!parsed.pathInRepo) {
        const repoSkills = await listSkillsInRepo(url);
        if (repoSkills.length > 0) {
            // Pick the first one for non-interactive or the one in 'skills/'
            const preferred = repoSkills.find(s => s.path.startsWith('skills/')) || repoSkills[0];
            finalUrl = `https://github.com/${parsed.owner}/${parsed.repo}/tree/${parsed.branch}/${preferred.path}`;
            console.log(chalk.gray(`Auto-detected skill in: ${preferred.path}`));
        }
    }

    console.log(chalk.gray(`Installing from URL: ${finalUrl}`));

    // Setup authentication if provided
    if (auth) {
        setupGitEnvironment(auth);
    }

    const spinner = p.spinner();
    spinner.start(`Downloading ${folderName}...`);

    const result = await installSkillFromUrl(finalUrl, folderName, path.dirname(skillsDir), {
        cursor: options.cursor,
        onProgress: (downloaded, total, lastFile) => {
            spinner.message(pc.dim(`[${downloaded}/${total}] ${lastFile}`));
        },
    });

    spinner.stop(pc.green(`✅ Installed: ${folderName}`));
}

async function installFromRegistry(name: string, skillsDir: string, options: InstallOptions) {
    p.log.step(pc.dim('Searching agenticskills.org marketplace...'));
    let skill = await findSkill(name);

    if (!skill) {
        p.log.step(pc.dim('Searching universal skills directory (skills.sh)...'));
        // findSkill already checks skills.sh as a fallback
        // we might want to split findSkill or just leave it if it works
    }

    if (!skill) {
        p.log.warn(`Skill "${name}" not found in registries.`);
        p.log.step(pc.cyan('Attempting Universal Resolution (GitHub Scan)...'));

        // If it's just a name, we can't really scan GitHub without an owner/repo
        // but we can suggest searching or using a URL
        p.log.info(pc.dim(`Tip: Use a GitHub URL or owner/repo format for direct scanning.`));
        p.log.info(pc.dim(`Example: npx ${CLI_BRANDING.brand_lower_name} add remotion-dev/skills`));
        process.exit(1);
    }

    p.log.info(pc.green(`Found ${pc.bold(skill.name)} in ${skill.source || 'registry'}`));
    p.log.step(pc.dim(`Installing from: ${skill.url}`));

    // Check if the registry skill URL requires authentication
    let auth: GitAuthOptions | undefined;
    if (skill.url.includes('github.com') && (skill.url.includes('.git') || skill.url.includes('private'))) {
        const credentials = await getAuthCredentials(skill.url, options);
        auth = credentials || undefined;
    }

    if (auth) {
        setupGitEnvironment(auth);
    }

    const spinner = p.spinner();
    spinner.start(`Downloading ${skill.name}...`);

    // Group by Repository Name (e.g. nuxt-skills/nuxthub)
    let targetFolder = skill.folder_name;
    const parsed = parseGitHubUrl(skill.url);
    if (parsed && parsed.repo) {
        targetFolder = path.join(parsed.repo, skill.folder_name);
    }

    await installSkillFromUrl(skill.url, targetFolder, path.dirname(skillsDir), {
        cursor: options.cursor,
        onProgress: (downloaded, total, lastFile) => {
            spinner.message(pc.dim(`[${downloaded}/${total}] ${lastFile}`));
        },
    });

    spinner.stop(pc.green(`✅ Installed: ${skill.name}`));
}

async function getAuthCredentials(url: string, options: InstallOptions): Promise<GitAuthOptions | null> {
    // If credentials provided via options, use them
    if (options.token || options.sshKey) {
        return {
            token: options.token,
            sshKey: options.sshKey
        };
    }

    // Try to load existing GitHub token
    const existingToken = loadGitHubToken();
    if (existingToken && !options.private) {
        return { token: existingToken };
    }

    // Prompt user for credentials
    console.log(chalk.yellow('\n🔐 Private repository detected - authentication required'));
    return await promptForGitAuth();
}

/**
 * Generate a folder name from GitHub URL components.
 */
function generateFolderName(owner: string, repo: string, pathInRepo: string): string {
    // 1. If checking out a specific path, prioritize the leaf folder name
    // e.g. skills/superdesign -> superdesign
    const parts = pathInRepo.split('/').filter((p) => p && p.length > 0);
    if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart.toLowerCase() !== 'skills' &&
            lastPart.toLowerCase() !== 'src' &&
            lastPart.toLowerCase() !== 'dist') {
            return lastPart.toLowerCase();
        }
    }

    // 2. Use repo name if it follows patterns like 'name-skill' or 'name-skills'
    if (/^[\w]+-skills?$/i.test(repo)) {
        return repo.toLowerCase();
    }

    // 3. Simple fallback to repo name (avoid long owner-repo unless necessary)
    return repo.toLowerCase();
}
