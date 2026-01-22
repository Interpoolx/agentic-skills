/**
 * Import skills from registry chunks into local D1 database
 * VALIDATES skill_file URLs before inserting - skips skills with 404 URLs
 * 
 * Usage:
 *   npx tsx scripts/import_chunks.ts [chunk_file] [--limit N] [--truncate]
 * 
 * Examples:
 *   npx tsx scripts/import_chunks.ts ../data/registry_chunks/agenticskills-registry-part-1.json --limit 5 --truncate
 *   npx tsx scripts/import_chunks.ts --all --truncate
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Author {
    name: string;
    github: string;
    email?: string;
}

interface SkillData {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    source: string;
    author: Author;
    version: string;
    requirements?: string[];
    compatible_agents?: string[];
    keywords?: string[];
    downloads: number;
    rating: number;
    reviews: number;
    created_at: string;
    updated_at: string;
    verified: boolean;
    owner: string;
    repo: string;
    skill_slug: string;
    skill_md_url?: string;
}

interface ChunkData {
    chunk_num: number;
    total_chunks: number;
    count: number;
    skills: SkillData[];
}

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function slugify(text: string): string {
    return text.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

function escapeSql(str: string | null | undefined): string {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}

function fixGithubUrl(url: string, owner: string, repo: string): string {
    if (!url || !url.includes('github.com')) return url;
    const repoBase = `https://github.com/${owner}/${repo}`;
    if (url.startsWith(repoBase) && url.length > repoBase.length + 1) {
        const pathPart = url.substring(repoBase.length + 1);
        if (!pathPart.startsWith('tree/') && !pathPart.startsWith('blob/')) {
            return `${repoBase}/tree/main/${pathPart}`;
        }
    }
    return url;
}

// Validate skill_file URL - returns true if URL returns 200
async function validateSkillFileUrl(url: string | undefined | null): Promise<boolean> {
    if (!url || !url.startsWith('http')) return false;
    try {
        const resp = await fetch(url, { method: 'HEAD' });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

function executeSQL(sql: string) {
    const tempFile = path.join(__dirname, '.temp_import.sql');
    fs.writeFileSync(tempFile, sql, 'utf-8');

    try {
        execSync(`npx wrangler d1 execute ralphy-skills-db --local --file="${tempFile}"`, {
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe'
        });
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

function executeSQLCommand(command: string) {
    try {
        execSync(`npx wrangler d1 execute ralphy-skills-db --local --command="${command.replace(/"/g, '\\"')}"`, {
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe'
        });
    } catch (e) {
        // Ignore errors
    }
}

async function importChunk(chunkPath: string, limit?: number) {
    console.log(`\n📂 Reading chunk: ${chunkPath}`);

    const rawData = fs.readFileSync(chunkPath, 'utf-8');
    const chunkData: ChunkData = JSON.parse(rawData);

    console.log(`   Chunk ${chunkData.chunk_num}/${chunkData.total_chunks} - ${chunkData.count} skills`);

    const skillsToProcess = limit ? chunkData.skills.slice(0, limit) : chunkData.skills;
    console.log(`   Processing ${skillsToProcess.length} skills (validating URLs)...`);

    const now = new Date().toISOString();
    let validSkillsCount = 0;
    let skippedCount = 0;

    // Validate and collect valid skills
    const validSkills: any[] = [];

    for (let i = 0; i < skillsToProcess.length; i++) {
        const skill = skillsToProcess[i];
        const skillFileUrl = skill.skill_md_url;

        // Progress indicator every 10 skills
        if ((i + 1) % 10 === 0 || i === skillsToProcess.length - 1) {
            process.stdout.write(`\r   Validating: ${i + 1}/${skillsToProcess.length} (valid: ${validSkillsCount}, skipped: ${skippedCount})`);
        }

        const isValid = await validateSkillFileUrl(skillFileUrl);

        if (!isValid) {
            skippedCount++;
            continue;
        }

        validSkillsCount++;
        validSkills.push(skill);
    }

    console.log(`\n   ✓ Validated: ${validSkillsCount} valid, ${skippedCount} skipped (404/invalid)`);

    if (validSkills.length === 0) {
        console.log('   No valid skills to import in this chunk.');
        return { ownersCreated: 0, reposCreated: 0, skillsCreated: 0, skipped: skippedCount };
    }

    // Collect unique owners and repos from valid skills
    const ownerSlugs = new Map<string, { name: string; url: string; stars: number }>();
    const repoSlugs = new Map<string, { ownerSlug: string; name: string; url: string; stars: number }>();
    const skillsData: any[] = [];

    for (const skill of validSkills) {
        const ownerSlug = slugify(skill.owner);
        const repoSlug = slugify(skill.repo);
        const skillSlug = slugify(skill.skill_slug || skill.id);
        const stars = skill.downloads || 0;

        if (!ownerSlugs.has(ownerSlug)) {
            ownerSlugs.set(ownerSlug, {
                name: skill.owner,
                url: `https://github.com/${skill.owner}`,
                stars
            });
        }

        const repoKey = `${ownerSlug}/${repoSlug}`;
        if (!repoSlugs.has(repoKey)) {
            repoSlugs.set(repoKey, {
                ownerSlug,
                name: skill.repo,
                url: `https://github.com/${skill.owner}/${skill.repo}`,
                stars
            });
        }

        const tagsJson = JSON.stringify([
            ...(skill.tags || []),
            ...(skill.keywords || [])
        ].filter((v, i, a) => a.indexOf(v) === i));

        const compatibilityJson = JSON.stringify({
            agents: skill.compatible_agents || [],
            requirements: skill.requirements || []
        });

        const authorName = skill.author?.name || skill.owner;
        const rawGithubUrl = skill.source || `https://github.com/${skill.owner}/${skill.repo}`;
        const githubUrl = fixGithubUrl(rawGithubUrl, skill.owner, skill.repo);

        skillsData.push({
            repoKey,
            skillSlug,
            name: skill.name,
            description: skill.description,
            version: skill.version || '1.0.0',
            category: skill.category || 'general',
            tags: tagsJson,
            compatibility: compatibilityJson,
            skillFile: skill.skill_md_url,
            author: authorName,
            githubUrl,
            downloads: skill.downloads || 0,
            stars,
            rating: skill.rating || 0,
            reviews: skill.reviews || 0,
            verified: skill.verified ? 1 : 0,
            createdAt: skill.created_at || now,
            updatedAt: skill.updated_at || now
        });
    }

    // Insert owners
    console.log(`   Inserting ${ownerSlugs.size} owners...`);
    const ownerSql: string[] = [];
    for (const [slug, data] of ownerSlugs) {
        const id = generateId('owner');
        ownerSql.push(`INSERT OR IGNORE INTO owners (id, slug, name, github_url, total_stars, created_at, updated_at) VALUES (${escapeSql(id)}, ${escapeSql(slug)}, ${escapeSql(data.name)}, ${escapeSql(data.url)}, ${data.stars}, ${escapeSql(now)}, ${escapeSql(now)});`);
    }
    if (ownerSql.length > 0) executeSQL(ownerSql.join('\n'));

    // Insert repos
    console.log(`   Inserting ${repoSlugs.size} repos...`);
    const repoSql: string[] = [];
    for (const [key, data] of repoSlugs) {
        const id = generateId('repo');
        const [ownerSlug, repoSlug] = key.split('/');
        repoSql.push(`INSERT OR IGNORE INTO repos (id, owner_id, slug, name, github_url, github_stars, created_at, updated_at) VALUES (${escapeSql(id)}, (SELECT id FROM owners WHERE slug = ${escapeSql(ownerSlug)}), ${escapeSql(repoSlug)}, ${escapeSql(data.name)}, ${escapeSql(data.url)}, ${data.stars}, ${escapeSql(now)}, ${escapeSql(now)});`);
    }
    if (repoSql.length > 0) executeSQL(repoSql.join('\n'));

    // Insert skills
    console.log(`   Inserting ${skillsData.length} skills...`);
    const skillSql: string[] = [];
    for (const skill of skillsData) {
        const skillId = generateId('skill');
        const [ownerSlug, repoSlug] = skill.repoKey.split('/');
        skillSql.push(`INSERT OR IGNORE INTO skills (
            id, repo_id, slug, name, short_description, full_description, version, 
            category, tags, compatibility, skill_file, author, github_url,
            total_installs, total_downloads, total_stars, average_rating, total_reviews,
            is_verified, status, created_at, updated_at, indexed_at
        ) VALUES (
            ${escapeSql(skillId)}, 
            (SELECT r.id FROM repos r JOIN owners o ON r.owner_id = o.id WHERE o.slug = ${escapeSql(ownerSlug)} AND r.slug = ${escapeSql(repoSlug)}),
            ${escapeSql(skill.skillSlug)}, ${escapeSql(skill.name)},
            ${escapeSql(skill.description)}, ${escapeSql(skill.description)}, ${escapeSql(skill.version)},
            ${escapeSql(skill.category)}, ${escapeSql(skill.tags)}, ${escapeSql(skill.compatibility)},
            ${escapeSql(skill.skillFile)}, ${escapeSql(skill.author)}, ${escapeSql(skill.githubUrl)},
            ${skill.downloads}, ${skill.downloads}, ${skill.stars},
            ${skill.rating}, ${skill.reviews}, ${skill.verified}, 'published',
            ${escapeSql(skill.createdAt)}, ${escapeSql(skill.updatedAt)}, ${escapeSql(now)}
        );`);
    }
    if (skillSql.length > 0) executeSQL(skillSql.join('\n'));

    console.log(`   ✅ Imported: ${ownerSlugs.size} owners, ${repoSlugs.size} repos, ${skillsData.length} skills`);

    return { ownersCreated: ownerSlugs.size, reposCreated: repoSlugs.size, skillsCreated: skillsData.length, skipped: skippedCount };
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: npx tsx scripts/import_chunks.ts <chunk_file> [--limit N] [--truncate]');
        console.log('       npx tsx scripts/import_chunks.ts --all [--truncate]');
        console.log('\nThis script validates skill_file URLs and only imports skills with valid URLs.');
        process.exit(1);
    }

    console.log('📊 Using Cloudflare D1 local database via wrangler');
    console.log('🔍 URL Validation: Only importing skills with valid skill_file URLs\n');

    let chunkFiles: string[] = [];
    let limit: number | undefined;
    let shouldTruncate = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--limit' && args[i + 1]) {
            limit = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--truncate') {
            shouldTruncate = true;
        } else if (args[i] === '--all') {
            const chunksDir = path.join(__dirname, '../../data/registry_chunks');
            if (fs.existsSync(chunksDir)) {
                const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.json')).sort();
                chunkFiles = files.map(f => path.join(chunksDir, f));
            }
        } else if (args[i].endsWith('.json')) {
            chunkFiles.push(path.resolve(args[i]));
        }
    }

    if (chunkFiles.length === 0) {
        console.error('❌ No chunk files specified or found');
        process.exit(1);
    }

    if (shouldTruncate) {
        console.log('🗑️  Truncating tables: skills, repos, owners...');
        executeSQLCommand('DELETE FROM skills');
        executeSQLCommand('DELETE FROM repos');
        executeSQLCommand('DELETE FROM owners');
        console.log('   Tables truncated.\n');
    }

    let totalOwners = 0, totalRepos = 0, totalSkills = 0, totalSkipped = 0;

    for (const chunkFile of chunkFiles) {
        const result = await importChunk(chunkFile, limit);
        totalOwners += result.ownersCreated;
        totalRepos += result.reposCreated;
        totalSkills += result.skillsCreated;
        totalSkipped += result.skipped;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 FINAL SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   ✅ Owners imported:  ${totalOwners}`);
    console.log(`   ✅ Repos imported:   ${totalRepos}`);
    console.log(`   ✅ Skills imported:  ${totalSkills}`);
    console.log(`   ⏭️  Skills skipped:   ${totalSkipped} (invalid URLs)`);
    console.log('='.repeat(50));

    console.log('\n📊 Updating aggregate counts...');
    executeSQLCommand('UPDATE repos SET total_skills = (SELECT COUNT(*) FROM skills WHERE skills.repo_id = repos.id)');
    executeSQLCommand('UPDATE owners SET total_repos = (SELECT COUNT(*) FROM repos WHERE repos.owner_id = owners.id), total_skills = (SELECT COUNT(*) FROM skills WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id))');
    console.log('   Done!');
}

main().catch(console.error);
