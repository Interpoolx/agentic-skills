import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { owners, repos, skills } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const db = drizzle(new Database('d:/react-projects/ralphy-skills/api/db/local.sqlite'));

async function importRegistry() {
    console.log('Starting registry import...');

    const registryPath = path.join('d:/react-projects/ralphy-skills/data/skills_registry.json');
    if (!fs.existsSync(registryPath)) {
        console.error('Registry file not found:', registryPath);
        return;
    }

    const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    console.log(`Found ${registryData.length} skills in registry.`);

    for (const item of registryData) {
        if (!item.githubUrl) {
            // Try to construct from owner/repo if available, or skip
            // Looking at common registry formats, they might have url or source
            console.log(`Skipping item without githubUrl: ${item.name}`);
            continue;
        }

        try {
            const match = item.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                console.log(`Invalid GitHub URL: ${item.githubUrl}`);
                continue;
            }

            const ownerSlug = match[1];
            const repoSlug = match[2].replace('.git', '');

            // 1. Ensure Owner
            let owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
            if (!owner) {
                const ownerId = `owner_${randomUUID()}`;
                await db.insert(owners).values({
                    id: ownerId,
                    slug: ownerSlug,
                    name: ownerSlug,
                    githubUrl: `https://github.com/${ownerSlug}`,
                    createdAt: new Date().toISOString()
                }).run();
                owner = await db.select().from(owners).where(eq(owners.id, ownerId)).get();
            }
            if (!owner) continue;

            // 2. Ensure Repo
            let repo = await db.select().from(repos).where(eq(repos.slug, repoSlug)).get();
            if (!repo) {
                const repoId = `repo_${randomUUID()}`;
                await db.insert(repos).values({
                    id: repoId,
                    slug: repoSlug,
                    name: repoSlug,
                    ownerId: owner.id,
                    githubUrl: `https://github.com/${ownerSlug}/${repoSlug}`,
                    createdAt: new Date().toISOString()
                }).run();
                repo = await db.select().from(repos).where(eq(repos.id, repoId)).get();
            }
            if (!repo) continue;

            // 3. Upsert Skill
            // Check by slug first? Or GitHub URL?
            // Ideally we check if a skill with this slug/repo exists.
            // Registry items might not have a 'slug', so we derive it from repo or name.
            const skillSlug = item.slug || repoSlug;

            let skill = await db.select().from(skills).where(eq(skills.slug, skillSlug)).get();

            if (skill) {
                console.log(`Updating skill: ${skillSlug}`);
                await db.update(skills).set({
                    repoId: repo.id,
                    name: item.name || repoSlug,
                    shortDescription: item.description,
                    category: item.category || 'general',
                    tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : item.tags,
                    githubUrl: item.githubUrl,
                    updatedAt: new Date().toISOString()
                }).where(eq(skills.id, skill.id)).run();
            } else {
                console.log(`Creating skill: ${skillSlug}`);
                await db.insert(skills).values({
                    id: `skill_${randomUUID()}`,
                    repoId: repo.id,
                    name: item.name || repoSlug,
                    slug: skillSlug,
                    shortDescription: item.description,
                    category: item.category || 'general',
                    tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : item.tags,
                    version: '1.0.0',
                    status: 'published',
                    githubUrl: item.githubUrl,
                    createdAt: new Date().toISOString()
                }).run();
            }

        } catch (e) {
            console.error(`Error processing ${item.name}:`, e);
        }
    }
    console.log('Registry import complete.');
}

importRegistry();
