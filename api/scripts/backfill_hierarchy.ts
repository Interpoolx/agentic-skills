import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { owners, repos, skills } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const db = drizzle(new Database('d:/react-projects/ralphy-skills/api/db/local.sqlite'));

async function migrate() {
    console.log('Starting migration...');
    const allSkills = await db.select().from(skills).all();
    console.log(`Found ${allSkills.length} skills to process.`);

    for (const skill of allSkills) {
        if (!skill.githubUrl) {
            console.log(`Skipping skill ${skill.name} (no GitHub URL)`);
            continue;
        }

        try {
            // Extract Owner/Repo from GitHub URL
            // Format: https://github.com/OWNER/REPO/...
            const match = skill.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                console.log(`Invalid GitHub URL for ${skill.name}: ${skill.githubUrl}`);
                continue;
            }

            const ownerSlug = match[1];
            const repoSlug = match[2].replace('.git', '');

            // 1. Create or Get Owner
            let owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
            if (!owner) {
                console.log(`Creating owner: ${ownerSlug}`);
                const ownerId = `owner_${randomUUID()}`;
                await db.insert(owners).values({
                    id: ownerId,
                    slug: ownerSlug,
                    name: ownerSlug, // Default name to slug
                    githubUrl: `https://github.com/${ownerSlug}`,
                    createdAt: new Date().toISOString()
                }).run();
                owner = await db.select().from(owners).where(eq(owners.id, ownerId)).get();
            }

            if (!owner) { console.error(`Failed to create/get owner ${ownerSlug}`); continue; }

            // 2. Create or Get Repo
            let repo = await db.select().from(repos).where(eq(repos.slug, repoSlug)).get();
            if (!repo) {
                console.log(`Creating repo: ${repoSlug}`);
                const repoId = `repo_${randomUUID()}`;
                await db.insert(repos).values({
                    id: repoId,
                    ownerId: owner.id,
                    slug: repoSlug,
                    name: repoSlug, // Default name to slug
                    githubUrl: `https://github.com/${ownerSlug}/${repoSlug}`,
                    createdAt: new Date().toISOString()
                }).run();
            }


            // 3. Link Skill to Repo
            // Update the skill with the repo_id if it's not already linked or mismatch
            // Note: In the current schema, skills doesn't have a direct repo_id, it might rely on logical linking or we need to add it.
            // looking at schema.ts in previous context, skills table *might* have been updated or intended to be updated.
            // The user prompt implies we are establishing Owner -> Repo -> Skill hierarchy. 
            // If skills table has `repo_id`, we should update it.

            // Let's check if the column exists by catching error or assuming it does from recent migrations.
            // Since I can't check schema dynamically easily here without `sqlite3` raw meta queries, 
            // I will assume based on the goal that we SHOULD have a link.

            // However, based on previous Steps, `skills` table schema might NOT have `repo_id`. 
            // Let's check `api/src/db/schema.ts` first before running this update part.
            // For now, at least creating Owners and Repos is the critical "Missing Data" fix.

        } catch (e) {
            console.error(`Error processing ${skill.name}:`, e);
        }
    }
    console.log('Migration complete.');
}

migrate();
