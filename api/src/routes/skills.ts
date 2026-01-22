import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { skills, owners, repos, skillSubmissions, skillLikes, skillViews, skillReviews } from '../db/schema'
import { eq, ne, like, desc, asc, sql, or, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import matter from 'gray-matter'
import * as path from 'node:path'

interface Env {
    DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

export const skillsRouter = app

app.get('/api/search', async (c) => {
    const db = drizzle(c.env.DB)
    const query = c.req.query('q') || ''
    const category = c.req.query('category')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 10000)
    const page = parseInt(c.req.query('page') || '1')
    const offset = (page - 1) * limit

    try {
        let whereConditions = [eq(skills.status, 'published')];

        if (category) {
            whereConditions.push(eq(skills.category, category));
        }

        if (query) {
            const searchCondition = or(
                like(skills.name, `%${query}%`),
                like(skills.shortDescription, `%${query}%`),
                like(skills.tags, `%${query}%`)
            );

            if (searchCondition) {
                whereConditions.push(searchCondition);
            }
        }

        const validWhere = and(...whereConditions);

        const results = await db.select({
            id: skills.id,
            name: skills.name,
            description: skills.shortDescription,
            slug: skills.slug,
            category: skills.category,
            tags: skills.tags,
            version: skills.version,
            totalInstalls: skills.totalInstalls,
            totalStars: skills.totalStars,
            skillFile: skills.skillFile,
            author: skills.author,
            repoId: skills.repoId,
            averageRating: skills.averageRating,
            totalReviews: skills.totalReviews,
            isVerified: skills.isVerified,
            isFeatured: skills.isFeatured,
            status: skills.status,
            compatibility: skills.compatibility,
            owner: owners.slug,
            repo: repos.slug,
            githubUrl: skills.githubUrl
        })
            .from(skills)
            .leftJoin(repos, eq(skills.repoId, repos.id))
            .leftJoin(owners, eq(repos.ownerId, owners.id))
            .where(validWhere)
            .orderBy(desc(skills.totalInstalls))
            .limit(limit)
            .offset(offset)
            .all();

        const flatResults = results.map(r => ({
            ...r,
            github_owner: r.owner,
            github_repo: r.repo,
            skill_slug: r.slug,
            skill_file: r.skillFile,
            install_count: r.totalInstalls,
            stars: r.totalStars,
            is_verified: r.isVerified,
            is_featured: r.isFeatured
        }));

        const totalCount = await db.select({ count: sql<number>`count(*)` }).from(skills).where(validWhere).get();

        return c.json({
            skills: flatResults,
            pagination: {
                page,
                limit,
                total: totalCount?.count || 0,
                hasMore: (offset + limit) < (totalCount?.count || 0)
            }
        })
    } catch (error) {
        console.error('Search error:', error)
        return c.json({ error: 'Search failed', skills: [] }, 500)
    }
})

app.get('/api/skills/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')

    try {
        const result = await db.select({
            skill: skills,
            repo: repos,
            owner: owners
        })
            .from(skills)
            .leftJoin(repos, eq(skills.repoId, repos.id))
            .leftJoin(owners, eq(repos.ownerId, owners.id))
            .where(eq(skills.id, id))
            .get()

        if (!result) return c.json({ error: 'Skill not found' }, 404)

        return c.json({
            ...result.skill,
            github_owner: result.owner?.slug,
            github_repo: result.repo?.slug,
            skill_slug: result.skill.slug,
            install_count: result.skill.totalInstalls,
            stars: result.skill.totalStars,
            description: result.skill.fullDescription || result.skill.shortDescription
        })
    } catch (error) {
        return c.json({ error: 'Failed to get skill' }, 500)
    }
})

app.get('/api/skills/:owner/:repo', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerSlug = c.req.param('owner')
    const repoSlug = c.req.param('repo')

    try {
        const ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        if (!ownerRecord) return c.json({ error: 'Owner not found' }, 404);

        const repoRecord = await db.select().from(repos)
            .where(and(eq(repos.slug, repoSlug), eq(repos.ownerId, ownerRecord.id)))
            .get();

        if (!repoRecord) return c.json({ error: 'Repo not found' }, 404);

        const repoSkills = await db.select().from(skills)
            .where(eq(skills.repoId, repoRecord.id))
            .all();

        const flatSkills = repoSkills.map(s => ({
            ...s,
            github_owner: ownerSlug,
            github_repo: repoSlug,
            skill_slug: s.slug,
            install_count: s.totalInstalls,
            description: s.shortDescription
        }));

        return c.json({
            owner: ownerSlug,
            repo: repoSlug,
            count: flatSkills.length,
            skills: flatSkills
        })
    } catch (error) {
        return c.json({ error: 'Failed to find skills for repo' }, 500)
    }
})

app.get('/api/skills/:owner/:repo/:skillSlug', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerSlug = c.req.param('owner')
    const repoSlug = c.req.param('repo')
    const skillSlug = c.req.param('skillSlug')

    try {
        const ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        if (!ownerRecord) return c.json({ error: 'Owner not found' }, 404);

        const repoRecord = await db.select().from(repos)
            .where(and(eq(repos.slug, repoSlug), eq(repos.ownerId, ownerRecord.id)))
            .get();
        if (!repoRecord) return c.json({ error: 'Repo not found' }, 404);

        const skillRecord = await db.select().from(skills)
            .where(and(
                eq(skills.repoId, repoRecord.id),
                or(eq(skills.slug, skillSlug), eq(skills.id, skillSlug))
            ))
            .get();

        if (skillRecord) {
            let content = '';
            let skillFileUrl = skillRecord.skillFile;
            if (!skillFileUrl && skillRecord.githubUrl) {
                skillFileUrl = skillRecord.githubUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/') + '/main/SKILL.md';
            } else if (skillFileUrl && !skillFileUrl.startsWith('http') && skillRecord.githubUrl) {
                skillFileUrl = skillRecord.githubUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/') + '/main/' + skillFileUrl;
            }

            if (skillFileUrl && skillFileUrl.startsWith('http')) {
                try {
                    // If already raw.githubusercontent, use directly. Otherwise transform.
                    let rawUrl = skillFileUrl;
                    if (skillFileUrl.includes('github.com') && !skillFileUrl.includes('raw.githubusercontent.com')) {
                        rawUrl = skillFileUrl
                            .replace('github.com', 'raw.githubusercontent.com')
                            .replace('/blob/', '/');
                    }
                    console.log('Fetching skill content from:', rawUrl);
                    const resp = await fetch(rawUrl);
                    if (resp.ok) {
                        content = await resp.text();
                    } else {
                        console.error('Failed to fetch skill content, status:', resp.status);
                    }
                } catch (e) {
                    console.error('Failed to fetch skill content:', e);
                }
            }

            const relatedSkillsRows = await db.select({
                id: skills.id,
                name: skills.name,
                slug: skills.slug,
                shortDescription: skills.shortDescription,
                totalInstalls: skills.totalInstalls
            }).from(skills)
                .where(and(
                    eq(skills.repoId, repoRecord.id),
                    ne(skills.id, skillRecord.id),
                    eq(skills.status, 'published')
                ))
                .limit(10)
                .all();

            const relatedSkills = relatedSkillsRows.map(s => ({
                ...s,
                github_owner: ownerSlug,
                github_repo: repoSlug,
                skill_slug: s.slug,
                install_count: s.totalInstalls
            }));

            const reviews = await db.select().from(skillReviews)
                .where(and(eq(skillReviews.skillId, skillRecord.id), eq(skillReviews.status, 'published')))
                .orderBy(desc(skillReviews.createdAt))
                .limit(10)
                .all();

            return c.json({
                ...skillRecord,
                content,
                tags: skillRecord.tags ? JSON.parse(skillRecord.tags) : [],
                compatibility: skillRecord.compatibility ? JSON.parse(skillRecord.compatibility) : { agents: [], requirements: [] },
                relatedSkills,
                reviews,
                github_owner: ownerSlug,
                github_repo: repoSlug,
                skill_slug: skillRecord.slug,
                install_count: skillRecord.totalInstalls,
                downloads: skillRecord.totalInstalls || skillRecord.totalDownloads || 0,
                stars: skillRecord.totalStars,
                description: skillRecord.fullDescription || skillRecord.shortDescription
            });
        }

        return c.json({ error: 'Skill not found' }, 404);

    } catch (error) {
        console.error('Resolve error:', error);
        return c.json({ error: 'Failed to resolve skill' }, 500)
    }
})

app.post('/api/skills/:id/install', async (c) => {
    const db = drizzle(c.env.DB)
    const skillId = c.req.param('id')

    try {
        await db.update(skills)
            .set({ totalInstalls: sql`total_installs + 1` })
            .where(eq(skills.id, skillId))
            .run();
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Track install failed' }, 500)
    }
})

app.post('/api/skills/:id/like', async (c) => {
    const db = drizzle(c.env.DB)
    const skillId = c.req.param('id')
    try {
        await db.update(skills)
            .set({ totalLikes: sql`total_likes + 1` })
            .where(eq(skills.id, skillId))
            .run();
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Like failed' }, 500)
    }
})

app.post('/api/skills/:id/view', async (c) => {
    const db = drizzle(c.env.DB)
    const skillId = c.req.param('id')
    try {
        await db.update(skills)
            .set({ totalViews: sql`total_views + 1` })
            .where(eq(skills.id, skillId))
            .run();

        await db.insert(skillViews).values({
            id: `view_${crypto.randomUUID()}`,
            skillId,
            ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
            viewedAt: new Date().toISOString()
        }).run();

        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'View track failed' }, 500)
    }
})

app.post('/api/skills/:id/reviews', async (c) => {
    const db = drizzle(c.env.DB)
    const skillId = c.req.param('id')
    const body = await c.req.json()
    const { rating, reviewText, username, honeypot } = body

    if (honeypot) return c.json({ error: 'Spam detected' }, 400);
    if (!reviewText) return c.json({ error: 'Review text required' }, 400);

    try {
        const id = `rev_${crypto.randomUUID()}`
        await db.insert(skillReviews).values({
            id,
            skillId,
            userId: 'anonymous',
            rating: rating || 5,
            reviewText,
            title: username || 'Anonymous',
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run();

        await db.update(skills)
            .set({ totalReviews: sql`total_reviews + 1` })
            .where(eq(skills.id, skillId))
            .run();

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Add review error:', error);
        return c.json({ error: 'Failed to add review' }, 500)
    }
})

app.get('/api/owners/:ownerSlug', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerSlug = c.req.param('ownerSlug')

    try {
        const ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        if (!ownerRecord) return c.json({ error: 'Owner not found' }, 404);

        const ownerRepos = await db.select().from(repos)
            .where(eq(repos.ownerId, ownerRecord.id))
            .all();

        const reposWithSkills = await Promise.all(ownerRepos.map(async (repo) => {
            const repoSkills = await db.select({
                id: skills.id,
                name: skills.name,
                slug: skills.slug,
                installCount: skills.totalInstalls
            }).from(skills)
                .where(eq(skills.repoId, repo.id))
                .all();

            return {
                ...repo,
                skills: repoSkills,
                total_installs: repoSkills.reduce((sum, s) => sum + (s.installCount || 0), 0)
            };
        }));

        const totalSkills = reposWithSkills.reduce((sum, r) => sum + r.skills.length, 0);
        const totalInstalls = reposWithSkills.reduce((sum, r) => sum + r.total_installs, 0);

        return c.json({
            ...ownerRecord,
            repos: reposWithSkills,
            stats: {
                repoCount: ownerRepos.length,
                skillCount: totalSkills,
                totalInstalls
            }
        });
    } catch (error) {
        console.error('Get owner error:', error);
        return c.json({ error: 'Failed to get owner details' }, 500);
    }
})

app.get('/api/skills/owner/:ownerSlug', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerSlug = c.req.param('ownerSlug')
    try {
        const ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        if (!ownerRecord) return c.json({ error: 'Owner not found' }, 404);

        const allSkills = await db.select({
            skill: skills,
            repo: repos
        })
            .from(skills)
            .innerJoin(repos, eq(skills.repoId, repos.id))
            .where(eq(repos.ownerId, ownerRecord.id))
            .all();

        const flatSkills = allSkills.map(r => ({
            ...r.skill,
            github_owner: ownerSlug,
            github_repo: r.repo.slug,
            skill_slug: r.skill.slug,
            install_count: r.skill.totalInstalls
        }));

        return c.json({
            owner: ownerSlug,
            count: flatSkills.length,
            skills: flatSkills
        })
    } catch (error) {
        return c.json({ error: 'Failed to find skills for owner' }, 500)
    }
})

app.get('/api/stats', async (c) => {
    const db = drizzle(c.env.DB);
    try {
        const skillCount = await db.select({ count: sql<number>`count(*)` }).from(skills).get();
        const installSum = await db.select({ sum: sql<number>`sum(total_installs)` }).from(skills).get();

        return c.json({
            skills: skillCount?.count || 0,
            totalInstalls: installSum?.sum || 0,
            categories: 10,
            lastUpdated: new Date().toISOString()
        })
    } catch (err) {
        return c.json({ error: 'Stats error' }, 500)
    }
});

// Filter options for admin panel dropdowns
app.get('/api/stats/filter-options', async (c) => {
    const db = drizzle(c.env.DB);
    try {
        // Get unique owners
        const ownersList = await db.select({ slug: owners.slug }).from(owners).all();
        const uniqueOwners = ownersList.map(o => o.slug).filter(Boolean);

        // Get unique repos
        const reposList = await db.select({ slug: repos.slug }).from(repos).all();
        const uniqueRepos = reposList.map(r => r.slug).filter(Boolean);

        // Get unique categories
        const categoriesList = await db.select({ category: skills.category }).from(skills).groupBy(skills.category).all();
        const uniqueCategories = categoriesList.map(c => c.category).filter(Boolean);

        // Get unique authors
        const authorsList = await db.select({ author: skills.author }).from(skills).groupBy(skills.author).all();
        const uniqueAuthors = authorsList.map(a => a.author).filter(Boolean);

        return c.json({
            owners: uniqueOwners,
            repos: uniqueRepos,
            categories: uniqueCategories,
            authors: uniqueAuthors,
            // Legacy compatibility - empty arrays
            platforms: [],
            sources: [],
            namespaces: []
        });
    } catch (err) {
        console.error('Filter options error:', err);
        return c.json({ error: 'Filter options error', owners: [], repos: [], categories: [], authors: [] }, 500);
    }
});

app.post('/api/skills/resolve', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { owner, repo, skillName } = body as { owner: string; repo: string; skillName?: string }

    if (!owner || !repo) {
        return c.json({ error: 'Owner and Repo are required' }, 400)
    }

    const ownerSlug = owner.toLowerCase()
    const repoSlug = repo.toLowerCase()
    const skillSlug = skillName ? skillName.toLowerCase() : undefined

    try {
        // 1. Check DB for Repo
        let ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        let repoRecord = null;

        if (ownerRecord) {
            repoRecord = await db.select().from(repos)
                .where(and(eq(repos.slug, repoSlug), eq(repos.ownerId, ownerRecord.id)))
                .get();
        }

        // 2. If repo exists
        if (repoRecord) {
            let foundSkill = null;
            if (skillSlug) {
                foundSkill = await db.select().from(skills)
                    .where(and(
                        eq(skills.repoId, repoRecord.id),
                        or(eq(skills.slug, skillSlug), eq(skills.id, skillSlug))
                    ))
                    .get();

                if (foundSkill) {
                    return c.json({
                        source: 'db',
                        skill: {
                            ...foundSkill,
                            github_owner: ownerSlug,
                            github_repo: repoSlug,
                            skill_slug: foundSkill.slug,
                            install_count: foundSkill.totalInstalls
                        }
                    });
                }
            } else {
                // Return all skills for this repo
                const repoSkills = await db.select().from(skills).where(eq(skills.repoId, repoRecord.id)).all();
                if (repoSkills.length > 0) {
                    const flatSkills = repoSkills.map(s => ({
                        ...s,
                        github_owner: ownerSlug,
                        github_repo: repoSlug,
                        skill_slug: s.slug,
                        install_count: s.totalInstalls
                    }));

                    return c.json({
                        source: 'db',
                        owner: ownerSlug,
                        repo: repoSlug,
                        skills: flatSkills
                    });
                }
            }
        }

        // 3. Fallback: Fetch from GitHub
        console.log(`Resolving from GitHub: ${ownerSlug}/${repoSlug}`);

        // Fetch Repo Info
        const repoResp = await fetch(`https://api.github.com/repos/${ownerSlug}/${repoSlug}`, {
            headers: { 'User-Agent': 'Agentic-Skills-Resolver' }
        });

        if (!repoResp.ok) {
            return c.json({ error: 'Repository not found on GitHub' }, 404);
        }

        const repoData = await repoResp.json() as any;
        const defaultBranch = repoData.default_branch || 'main';

        // Ensure Owner Exists in DB
        if (!ownerRecord) {
            const newOwnerId = `owner_${uuidv4()}`;
            await db.insert(owners).values({
                id: newOwnerId,
                slug: ownerSlug,
                name: repoData.owner.login,
                avatarUrl: repoData.owner.avatar_url,
                githubUrl: repoData.owner.html_url,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }).run();
            ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        }

        // Ensure Repo Exists in DB
        if (!repoRecord && ownerRecord) {
            const newRepoId = `repo_${uuidv4()}`;
            await db.insert(repos).values({
                id: newRepoId,
                ownerId: ownerRecord.id,
                slug: repoSlug,
                name: repoData.name,
                description: repoData.description,
                githubUrl: repoData.html_url,
                githubStars: repoData.stargazers_count,
                githubForks: repoData.forks_count,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }).run();
            repoRecord = await db.select().from(repos).where(and(eq(repos.slug, repoSlug), eq(repos.ownerId, ownerRecord.id))).get();
        }

        if (!ownerRecord || !repoRecord) {
            return c.json({ error: 'Database sync failed' }, 500);
        }

        // 4. Scan for Skills
        const possibleFiles: { path: string; name: string; slug: string }[] = [];

        if (skillName) {
            possibleFiles.push({ path: `skills/${skillName}/SKILL.md`, name: skillName, slug: skillName });
            if (skillSlug === repoSlug) {
                possibleFiles.push({ path: 'SKILL.md', name: repoData.name, slug: repoSlug });
            }
        } else {
            possibleFiles.push({ path: 'SKILL.md', name: repoData.name, slug: repoSlug });

            const treeResp = await fetch(`https://api.github.com/repos/${ownerSlug}/${repoSlug}/contents/skills`, {
                headers: { 'User-Agent': 'Agentic-Skills-Resolver' }
            });

            if (treeResp.ok) {
                const items = await treeResp.json() as any[];
                if (Array.isArray(items)) {
                    const folderSkills = items
                        .filter(i => i.type === 'dir')
                        .map(i => ({ path: `skills/${i.name}/SKILL.md`, name: i.name, slug: i.name.toLowerCase() }));
                    possibleFiles.push(...folderSkills);
                }
            }
        }

        const stats = { found: 0, imported: 0 };
        const importedSkills = [];
        const seenSlugs = new Set();

        for (const file of possibleFiles) {
            if (seenSlugs.has(file.slug)) continue;

            const rawUrl = `https://raw.githubusercontent.com/${ownerSlug}/${repoSlug}/${defaultBranch}/${file.path}`;
            const fileResp = await fetch(rawUrl);

            if (fileResp.ok) {
                const content = await fileResp.text();
                let data: any = {};
                try {
                    const parsed = matter(content);
                    data = parsed.data;
                } catch (e) {
                    console.error(`Failed to parse markdown for ${file.path}`);
                }

                // If no frontmatter/invalid, construct basic metadata
                const name = data.name || file.name;
                const description = data.description || repoData.description || 'No description';

                let existingSkill = await db.select().from(skills)
                    .where(and(eq(skills.repoId, repoRecord!.id), eq(skills.slug, file.slug)))
                    .get();

                const newSkillValues = {
                    repoId: repoRecord!.id,
                    slug: file.slug,
                    name: name,
                    shortDescription: description.substring(0, 200),
                    fullDescription: description,
                    version: data.version || '1.0.0',
                    category: data.category || 'general',
                    tags: JSON.stringify(data.tags || []),
                    author: data.author || repoData.owner.login,
                    license: data.license || repoData.license?.spdx_id || 'MIT',
                    githubUrl: `https://github.com/${ownerSlug}/${repoSlug}/tree/${defaultBranch}/${path.dirname(file.path)}`,
                    skillFile: file.path,
                    updatedAt: new Date().toISOString(),
                    indexedAt: new Date().toISOString()
                };

                if (existingSkill) {
                    await db.update(skills).set(newSkillValues).where(eq(skills.id, existingSkill.id)).run();
                    importedSkills.push({ ...existingSkill, ...newSkillValues });
                } else {
                    const newId = data.id || `${ownerSlug}-${repoSlug}-${file.slug}`.toLowerCase();
                    const insertValues = {
                        id: newId,
                        ...newSkillValues,
                        totalInstalls: 0,
                        totalStars: 0,
                        status: 'published',
                        createdAt: new Date().toISOString()
                    };
                    try {
                        await db.insert(skills).values(insertValues as any).run();
                        importedSkills.push(insertValues);
                    } catch (err) {
                        console.error('Insert failed', err);
                    }
                }
                seenSlugs.add(file.slug);
                stats.found++;
                stats.imported++;
            }
        }

        if (stats.found === 0) {
            return c.json({ error: 'No skills found in repository' }, 404);
        }

        return c.json({
            source: 'github-import',
            owner: ownerSlug,
            repo: repoSlug,
            count: importedSkills.length,
            skills: importedSkills.map(s => ({
                ...s,
                github_owner: ownerSlug,
                github_repo: repoSlug,
                skill_slug: s.slug
            }))
        });

    } catch (error: any) {
        console.error('Resolve error:', error);
        return c.json({ error: 'Resolution failed', details: error.message }, 500)
    }
});

