/**
 * Clean registry JSON files - removes entries with invalid skill_md_url
 * 
 * Usage:
 *   npx tsx scripts/clean_registry.ts [--dry-run]
 * 
 * Options:
 *   --dry-run  Show what would be removed without modifying files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SkillData {
    id: string;
    name: string;
    skill_md_url?: string;
    [key: string]: any;
}

interface ChunkData {
    chunk_num: number;
    total_chunks: number;
    count: number;
    skills: SkillData[];
}

async function validateUrl(url: string | undefined | null): Promise<boolean> {
    if (!url || !url.startsWith('http')) return false;
    try {
        const resp = await fetch(url, { method: 'HEAD' });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

async function cleanChunkFile(filePath: string, dryRun: boolean): Promise<{ valid: number; removed: number }> {
    console.log(`\n📂 Processing: ${path.basename(filePath)}`);

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const chunkData: ChunkData = JSON.parse(rawData);

    console.log(`   Original count: ${chunkData.skills.length} skills`);

    const CONCURRENCY_LIMIT = 50; // Validate 50 URLs at a time
    const validSkills: SkillData[] = [];
    const removedSkills: string[] = [];

    for (let i = 0; i < chunkData.skills.length; i += CONCURRENCY_LIMIT) {
        const chunk = chunkData.skills.slice(i, i + CONCURRENCY_LIMIT);

        process.stdout.write(`\r   Validating: ${Math.min(i + CONCURRENCY_LIMIT, chunkData.skills.length)}/${chunkData.skills.length}`);

        await Promise.all(chunk.map(async (skill) => {
            const isValid = await validateUrl(skill.skill_md_url);
            if (isValid) {
                validSkills.push(skill);
            } else {
                removedSkills.push(skill.name);
            }
        }));
    }

    console.log(`\n   ✓ Valid: ${validSkills.length}, Removed: ${removedSkills.length}`);

    if (!dryRun && removedSkills.length > 0) {
        // Update the chunk data
        chunkData.skills = validSkills;
        chunkData.count = validSkills.length;

        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(chunkData, null, 2), 'utf-8');
        console.log(`   ✅ File updated!`);
    } else if (dryRun && removedSkills.length > 0) {
        console.log(`   [DRY RUN] Would remove ${removedSkills.length} skills`);
        if (removedSkills.length <= 10) {
            removedSkills.forEach(name => console.log(`      - ${name}`));
        } else {
            removedSkills.slice(0, 5).forEach(name => console.log(`      - ${name}`));
            console.log(`      ... and ${removedSkills.length - 5} more`);
        }
    }

    return { valid: validSkills.length, removed: removedSkills.length };
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('🧹 Registry Cleaner - Removing skills with invalid URLs');
    console.log('=========================================================');
    if (dryRun) {
        console.log('📋 DRY RUN MODE - No files will be modified\n');
    } else {
        console.log('⚠️  LIVE MODE - Files will be modified!\n');
    }

    const chunksDir = path.join(__dirname, '../../data/registry_chunks');

    if (!fs.existsSync(chunksDir)) {
        console.error(`❌ Chunks directory not found: ${chunksDir}`);
        process.exit(1);
    }

    const chunkFiles = fs.readdirSync(chunksDir)
        .filter(f => f.endsWith('.json') && f.includes('registry'))
        .sort()
        .map(f => path.join(chunksDir, f));

    console.log(`Found ${chunkFiles.length} registry chunk files`);

    let totalValid = 0;
    let totalRemoved = 0;

    for (const chunkFile of chunkFiles) {
        const result = await cleanChunkFile(chunkFile, dryRun);
        totalValid += result.valid;
        totalRemoved += result.removed;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 FINAL SUMMARY:');
    console.log('='.repeat(50));
    console.log(`   ✅ Skills with valid URLs: ${totalValid}`);
    console.log(`   ❌ Skills removed:         ${totalRemoved}`);
    console.log('='.repeat(50));

    if (dryRun) {
        console.log('\n📋 This was a dry run. Run without --dry-run to apply changes.');
    }
}

main().catch(console.error);
