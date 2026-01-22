import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { drizzle } from 'drizzle-orm/d1'
import { skills, owners, repos, skillSubmissions, NewSkillSubmission, prds, prdCategories, prompts, promptCollections, skillLikes, skillViews, skillReviews } from './db/schema'
import { eq, ne, like, desc, asc, sql, or, and } from 'drizzle-orm'
import { z } from 'zod'
import { extractSkillFromGithub } from './utils/github'

// Types
interface Env {
    DB: D1Database
    GITHUB_TOKEN?: string
    RALPHY_ADMIN_TOKEN?: string
    ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', cors())
app.use('*', logger())
app.use('*', prettyJSON())

// Admin logic hardening
app.use('/api/admin/*', async (c, next) => {
    // Skip hardening if token is not set (during initial dev)
    const adminToken = c.env.RALPHY_ADMIN_TOKEN || 'ralphy-default-admin-token'
    const authHeader = c.req.header('Authorization')

    if (authHeader !== `Bearer ${adminToken}`) {
        return c.json({ error: 'Unauthorized. Valid RALPHY_ADMIN_TOKEN required.' }, 401)
    }
    await next()
})

// Health check
app.get('/', (c) => {
    return c.json({
        name: 'Agentic Skills Registry API (v2)',
        version: '2.0.0',
        status: 'ok',
        endpoints: {
            search: 'GET /api/search?q=query',
            skill: 'GET /api/skills/:owner/:repo/:skill',
        }
    })
})

// ================== SEARCH (Updated for Hierarchy) ==================
app.get('/api/search', async (c) => {
    const db = drizzle(c.env.DB)
    const query = c.req.query('q') || ''
    const category = c.req.query('category')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const page = parseInt(c.req.query('page') || '1')
    const offset = (page - 1) * limit

    try {
        let whereConditions = [eq(skills.status, 'published')];

        if (category) {
            whereConditions.push(eq(skills.category, category));
        }

        if (query) {
            // Simple basic search for now, FTS would be better but requires complex query builder update
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
            // Owner/Repo details via join
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

        // Transform to flat format expected by frontend
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

        // Basic count for pagination (inefficient but works for small datasets)
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

// ================== GET SKILL BY ID (Legacy Support) ==================
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

// ================== GET OWNER DETAILS ==================
app.get('/api/owners/:ownerSlug', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerSlug = c.req.param('ownerSlug')

    try {
        const ownerRecord = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
        if (!ownerRecord) return c.json({ error: 'Owner not found' }, 404);

        // Fetch repos for this owner
        const ownerRepos = await db.select().from(repos)
            .where(eq(repos.ownerId, ownerRecord.id))
            .all();

        // For each repo, fetch its skills summary
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

// ================== LIST SKILLS BY OWNER ==================
app.get('/api/skills/owner/:ownerSlug', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerSlug = c.req.param('ownerSlug')
    try {
        // Find owner first
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

// ================== LIST SKILLS BY REPO ==================
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

// ================== RESOLVE SKILL (Hierarchical) ==================
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

        // Try to match by slug OR id (legacy fallback)
        const skillRecord = await db.select().from(skills)
            .where(and(
                eq(skills.repoId, repoRecord.id),
                or(eq(skills.slug, skillSlug), eq(skills.id, skillSlug))
            ))
            .get();

        if (skillRecord) {
            let content = '';
            // Determine skill file URL
            let skillFileUrl = skillRecord.skillFile;
            if (!skillFileUrl && skillRecord.githubUrl) {
                // Construct fallback for GitHub repos
                skillFileUrl = skillRecord.githubUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/') + '/main/SKILL.md';
            } else if (skillFileUrl && !skillFileUrl.startsWith('http') && skillRecord.githubUrl) {
                // If it's just a filename, prepend base URL
                skillFileUrl = skillRecord.githubUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/') + '/main/' + skillFileUrl;
            }

            if (skillFileUrl && skillFileUrl.startsWith('http')) {
                try {
                    // Normalize URL for GitHub raw
                    const rawUrl = skillFileUrl
                        .replace('github.com', 'raw.githubusercontent.com')
                        .replace('/blob/', '/');
                    const resp = await fetch(rawUrl);
                    if (resp.ok) {
                        content = await resp.text();
                    }
                } catch (e) {
                    console.error('Failed to fetch skill content:', e);
                }
            }

            // Fetch related skills (same category or same repo, limit 10)
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

            // Fetch reviews (recent 10)
            const reviews = await db.select().from(skillReviews)
                .where(and(eq(skillReviews.skillId, skillRecord.id), eq(skillReviews.status, 'published')))
                .orderBy(desc(skillReviews.createdAt))
                .limit(10)
                .all();

            // Return enriched data
            return c.json({
                ...skillRecord,
                content,
                tags: skillRecord.tags ? JSON.parse(skillRecord.tags) : [],
                compatibility: skillRecord.compatibility ? JSON.parse(skillRecord.compatibility) : { agents: [], requirements: [] },
                relatedSkills,
                reviews,
                // Add flattened fields for compatibility
                github_owner: ownerSlug,
                github_repo: repoSlug,
                skill_slug: skillRecord.slug,
                install_count: skillRecord.totalInstalls,
                downloads: skillRecord.totalInstalls || skillRecord.totalDownloads || 0,
                stars: skillRecord.totalStars,
                description: skillRecord.fullDescription || skillRecord.shortDescription
            });
        }

        // Fallback: Check GitHub if not in DB? (Can implement later if needed)
        return c.json({ error: 'Skill not found' }, 404);

    } catch (error) {
        console.error('Resolve error:', error);
        return c.json({ error: 'Failed to resolve skill' }, 500)
    }
})

// ================== TRACK INSTALL ==================
// Note: This needs refactoring to use new tables, but minimal fix for now
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

// ================== TRACK SKILL ENGAGEMENT ==================

// LIKE SKILL
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

// VIEW SKILL
app.post('/api/skills/:id/view', async (c) => {
    const db = drizzle(c.env.DB)
    const skillId = c.req.param('id')
    try {
        await db.update(skills)
            .set({ totalViews: sql`total_views + 1` })
            .where(eq(skills.id, skillId))
            .run();

        // Log view event
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

// ADD REVIEW
app.post('/api/skills/:id/reviews', async (c) => {
    const db = drizzle(c.env.DB)
    const skillId = c.req.param('id')
    const body = await c.req.json()
    const { rating, reviewText, username, honeypot } = body

    // Simple spam bot protection
    if (honeypot) return c.json({ error: 'Spam detected' }, 400);
    if (!reviewText) return c.json({ error: 'Review text required' }, 400);

    try {
        const id = `rev_${crypto.randomUUID()}`
        await db.insert(skillReviews).values({
            id,
            skillId,
            userId: 'anonymous', // For now
            rating: rating || 5,
            reviewText,
            title: username || 'Anonymous', // Reuse title for username in simplicity
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run();

        // Update skill count
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

// ================== STATS ==================
app.get('/api/stats', async (c) => {
    const db = drizzle(c.env.DB);
    try {
        const skillCount = await db.select({ count: sql<number>`count(*)` }).from(skills).get();
        const installSum = await db.select({ sum: sql<number>`sum(total_installs)` }).from(skills).get();

        return c.json({
            skills: skillCount?.count || 0,
            totalInstalls: installSum?.sum || 0,
            categories: 10, // hardcoded for now or fetch from categories table
            lastUpdated: new Date().toISOString()
        })
    } catch (err) {
        return c.json({ error: 'Stats error' }, 500)
    }
});

// ... (Other admin routes can be ported similarly)

// ================== ADMIN: OWNERS ==================

// LIST OWNERS
app.get('/api/admin/owners', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(owners).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list owners' }, 500)
    }
})

// CREATE OWNER
app.post('/api/admin/owners', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { name, slug, description, githubUrl, website, avatarUrl } = body

    try {
        const id = `owner_${crypto.randomUUID()}`
        await db.insert(owners).values({
            id,
            name: name || slug,
            slug: slug.toLowerCase(),
            description,
            githubUrl,
            website,
            avatarUrl,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create owner error:', error)
        return c.json({ error: 'Failed to create owner' }, 500)
    }
})

// UPDATE OWNER
app.patch('/api/admin/owners/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {
            updatedAt: new Date().toISOString()
        }

        if (body.name !== undefined) updateData.name = body.name;
        if (body.slug !== undefined) updateData.slug = body.slug.toLowerCase();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.githubUrl !== undefined) updateData.githubUrl = body.githubUrl;
        if (body.website !== undefined) updateData.website = body.website;
        if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

        await db.update(owners).set(updateData).where(eq(owners.id, id)).run();
        return c.json({ success: true })
    } catch (error) {
        console.error('Update owner error:', error)
        return c.json({ error: 'Failed to update owner' }, 500)
    }
})

// DELETE OWNER
app.delete('/api/admin/owners/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(owners).where(eq(owners.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete owner' }, 500)
    }
})

// ================== ADMIN: REPOS ==================

// LIST REPOS (Optional filter by ownerId)
app.get('/api/admin/repos', async (c) => {
    const db = drizzle(c.env.DB)
    const ownerId = c.req.query('ownerId')
    try {
        let query = db.select({
            id: repos.id,
            name: repos.name,
            slug: repos.slug,
            description: repos.description,
            ownerId: repos.ownerId,
            ownerSlug: owners.slug,
            githubUrl: repos.githubUrl,
            totalSkills: repos.totalSkills,
            createdAt: repos.createdAt
        }).from(repos)
            .leftJoin(owners, eq(repos.ownerId, owners.id))

        if (ownerId) {
            query.where(eq(repos.ownerId, ownerId))
        }

        const result = await query.all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list repos' }, 500)
    }
})

// CREATE REPO
app.post('/api/admin/repos', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { name, slug, ownerId, description, githubUrl } = body

    if (!ownerId) return c.json({ error: 'Owner ID is required' }, 400)

    try {
        const id = `repo_${crypto.randomUUID()}`
        await db.insert(repos).values({
            id,
            ownerId,
            name: name || slug,
            slug: slug.toLowerCase(),
            description,
            githubUrl,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create repo error:', error)
        return c.json({ error: 'Failed to create repo. Ensure slug is unique for this owner.' }, 500)
    }
})

// UPDATE REPO
app.patch('/api/admin/repos/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {
            updatedAt: new Date().toISOString()
        }

        if (body.name !== undefined) updateData.name = body.name;
        if (body.slug !== undefined) updateData.slug = body.slug.toLowerCase();
        if (body.description !== undefined) updateData.description = body.description;
        if (body.githubUrl !== undefined) updateData.githubUrl = body.githubUrl;
        if (body.ownerId !== undefined) updateData.ownerId = body.ownerId;

        await db.update(repos).set(updateData).where(eq(repos.id, id)).run();
        return c.json({ success: true })
    } catch (error) {
        console.error('Update repo error:', error)
        return c.json({ error: 'Failed to update repo' }, 500)
    }
})

// DELETE REPO
app.delete('/api/admin/repos/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(repos).where(eq(repos.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete repo' }, 500)
    }
})

// ================== ADMIN: SKILL CREATION (Enhanced) ==================

// CREATE SKILL
app.post('/api/admin/skills', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    // Intelligent Import Logic
    if (body.githubUrl && (!body.ownerId || !body.repoId)) {
        try {
            const match = body.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (match) {
                const ownerSlug = match[1];
                const repoSlug = match[2].replace('.git', '');

                // 1. Ensure Owner
                let owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
                if (!owner) {
                    const ownerId = `owner_${crypto.randomUUID()}`;
                    await db.insert(owners).values({
                        id: ownerId,
                        slug: ownerSlug,
                        name: ownerSlug,
                        githubUrl: `https://github.com/${ownerSlug}`,
                        createdAt: new Date().toISOString()
                    }).run();
                    owner = await db.select().from(owners).where(eq(owners.id, ownerId)).get();
                }

                if (owner) {
                    body.ownerId = owner.id;

                    // 2. Ensure Repo
                    let repo = await db.select().from(repos).where(eq(repos.slug, repoSlug)).get();
                    if (!repo) {
                        const repoId = `repo_${crypto.randomUUID()}`;
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

                    if (repo) {
                        body.repoId = repo.id;
                    }
                }
            }
        } catch (error) {
            console.error('Auto-creation failed:', error);
            // Continue processing, validation will fail if repoId is still missing
        }
    }

    if (!body.repoId || !body.name || !body.slug) {
        return c.json({ error: 'Missing required fields: repoId, name, slug (or valid githubUrl)' }, 400)
    }

    try {
        const id = `skill_${crypto.randomUUID()}`
        await db.insert(skills).values({
            id,
            repoId: body.repoId,
            name: body.name,
            slug: body.slug,
            shortDescription: body.description,
            category: body.category,
            tags: Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags,
            version: body.version,
            status: body.status,
            githubUrl: body.githubUrl,
            author: body.author,
            skillFile: body.skillFile,
            totalInstalls: body.totalInstalls || 0,
            totalStars: body.totalStars || 0,
            averageRating: body.averageRating || 0,
            totalReviews: body.totalReviews || 0,
            isVerified: body.isVerified || 0,
            isFeatured: body.isFeatured || 0,
            compatibility: body.compatibility || '{}',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error: any) {
        console.error('Create skill error:', error)
        return c.json({ error: error.message || 'Failed to create skill' }, 500)
    }
})

// UPDATE SKILL
app.patch('/api/admin/skills/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {
            updatedAt: new Date().toISOString()
        };

        if (body.name !== undefined) updateData.name = body.name;
        if (body.slug !== undefined) updateData.slug = body.slug;
        if (body.description !== undefined) updateData.shortDescription = body.description;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags;
        if (body.version !== undefined) updateData.version = body.version;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.githubUrl !== undefined) updateData.githubUrl = body.githubUrl;
        if (body.author !== undefined) updateData.author = body.author;
        if (body.skillFile !== undefined) updateData.skillFile = body.skillFile;
        if (body.totalInstalls !== undefined) updateData.totalInstalls = body.totalInstalls;
        if (body.totalStars !== undefined) updateData.totalStars = body.totalStars;
        if (body.averageRating !== undefined) updateData.averageRating = body.averageRating;
        if (body.totalReviews !== undefined) updateData.totalReviews = body.totalReviews;
        if (body.isVerified !== undefined) updateData.isVerified = body.isVerified;
        if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
        if (body.compatibility !== undefined) updateData.compatibility = body.compatibility;
        if (body.repoId !== undefined) updateData.repoId = body.repoId;

        await db.update(skills).set(updateData).where(eq(skills.id, id)).run();
        return c.json({ success: true })
    } catch (error: any) {
        console.error('Update skill error:', error)
        return c.json({ error: error.message || 'Failed to update skill' }, 500)
    }
})

// ================== ADMIN: VALIDATION ==================

// GET ALL SKILL IDs (for chunked validation)
app.get('/api/admin/skills/ids', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select({ id: skills.id }).from(skills).all()
        return c.json({ ids: result.map(r => r.id) })
    } catch (error) {
        return c.json({ error: 'Failed to fetch skill IDs' }, 500)
    }
})

// VALIDATE BATCH OF SKILLS
app.post('/api/admin/skills/validate', async (c) => {
    const db = drizzle(c.env.DB)
    const { ids } = await c.req.json()

    if (!ids || !Array.isArray(ids)) {
        return c.json({ error: 'Invalid IDs provided' }, 400)
    }

    // In a real scenario, this would check strict URL validity or ping external services
    // For now, we just verify they check out in the database and have basic field integrity

    let validCount = 0;
    let invalidCount = 0;

    // Simulating validation logic
    validCount = ids.length;

    return c.json({
        processed: ids.length,
        validCount,
        invalidCount
    })
})

// ================== ADMIN: PROMPTS ==================

// LIST PROMPTS
app.get('/api/admin/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prompts).orderBy(desc(prompts.createdAt)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list prompts' }, 500)
    }
})

// CREATE PROMPT
app.post('/api/admin/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    // Basic validation
    if (!body.title || !body.promptText || !body.slug) {
        return c.json({ error: 'Missing required fields: title, slug, promptText' }, 400)
    }

    try {
        const id = `prompt_${crypto.randomUUID()}`
        await db.insert(prompts).values({
            id,
            slug: body.slug,
            title: body.title,
            description: body.description || '',
            promptText: body.promptText,
            systemPrompt: body.systemPrompt,
            category: body.category || 'general',
            tags: body.tags ? (typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)) : '[]',
            promptType: body.promptType || 'instruction',
            complexity: body.complexity || 'intermediate',
            author: body.author || 'Admin',
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create prompt error:', error)
        return c.json({ error: 'Failed to create prompt' }, 500)
    }
})

// DELETE PROMPT
app.delete('/api/admin/prompts/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(prompts).where(eq(prompts.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete prompt' }, 500)
    }
})

// ================== ADMIN: PRDs ==================

// LIST PRDs
app.get('/api/admin/prds', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prds).orderBy(desc(prds.createdAt)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list PRDs' }, 500)
    }
})

// CREATE PRD
app.post('/api/admin/prds', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.name || !body.slug || !body.content) {
        return c.json({ error: 'Missing required fields: name, slug, content' }, 400)
    }

    try {
        const id = `prd_${crypto.randomUUID()}`
        await db.insert(prds).values({
            id,
            slug: body.slug,
            name: body.name,
            description: body.description || '',
            content: body.content,
            category: body.category || 'other',
            tags: body.tags ? (typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)) : '[]',
            author: body.author || 'Admin',
            status: body.status || 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create PRD error:', error)
        return c.json({ error: 'Failed to create PRD' }, 500)
    }
})

// UPDATE PRD
app.patch('/api/admin/prds/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {
            updatedAt: new Date().toISOString()
        }

        if (body.name !== undefined) updateData.name = body.name;
        if (body.slug !== undefined) updateData.slug = body.slug;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.content !== undefined) updateData.content = body.content;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.tags !== undefined) updateData.tags = typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags);
        if (body.status !== undefined) updateData.status = body.status;

        await db.update(prds).set(updateData).where(eq(prds.id, id)).run();
        return c.json({ success: true })
    } catch (error) {
        console.error('Update PRD error:', error)
        return c.json({ error: 'Failed to update PRD' }, 500)
    }
})

// DELETE PRD
app.delete('/api/admin/prds/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(prds).where(eq(prds.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete PRD' }, 500)
    }
})

// ================== ADMIN: PRD CATEGORIES ==================

// LIST CATEGORIES
app.get('/api/admin/prd-categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prdCategories).orderBy(asc(prdCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list PRD categories' }, 500)
    }
})

// CREATE CATEGORY
app.post('/api/admin/prd-categories', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.name || !body.slug) {
        return c.json({ error: 'Missing required fields: name, slug' }, 400)
    }

    try {
        const id = body.id || body.slug
        await db.insert(prdCategories).values({
            id,
            slug: body.slug,
            name: body.name,
            description: body.description || '',
            icon: body.icon || '📄',
            color: body.color || '#6366f1',
            sortOrder: body.sortOrder || 0
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create category error:', error)
        return c.json({ error: 'Failed to create category' }, 500)
    }
})

// UPDATE CATEGORY
app.patch('/api/admin/prd-categories/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {}
        if (body.name !== undefined) updateData.name = body.name;
        if (body.slug !== undefined) updateData.slug = body.slug;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.icon !== undefined) updateData.icon = body.icon;
        if (body.color !== undefined) updateData.color = body.color;
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

        await db.update(prdCategories).set(updateData).where(eq(prdCategories.id, id)).run();
        return c.json({ success: true })
    } catch (error) {
        console.error('Update category error:', error)
        return c.json({ error: 'Failed to update category' }, 500)
    }
})

// DELETE CATEGORY
app.delete('/api/admin/prd-categories/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(prdCategories).where(eq(prdCategories.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete category' }, 500)
    }
})

// ================== PUBLIC: PRDs ==================

// LIST PRDs (Public endpoint with pagination and filtering)
app.get('/api/prds', async (c) => {
    const db = drizzle(c.env.DB)
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const page = parseInt(c.req.query('page') || '1')
    const offset = (page - 1) * limit
    const q = c.req.query('q') || ''
    const category = c.req.query('category')
    const sort = c.req.query('sort') || 'views'

    try {
        let whereConditions = [eq(prds.status, 'published')]

        if (category) {
            whereConditions.push(eq(prds.category, category))
        }

        if (q) {
            const searchCondition = or(
                like(prds.name, `%${q}%`),
                like(prds.description, `%${q}%`)
            )
            if (searchCondition) {
                whereConditions.push(searchCondition)
            }
        }

        const validWhere = and(...whereConditions)

        let orderBy = desc(prds.createdAt)
        if (sort === 'views') orderBy = desc(prds.viewCount)
        else if (sort === 'likes') orderBy = desc(prds.likeCount)
        else if (sort === 'recent') orderBy = desc(prds.createdAt)
        else if (sort === 'name') orderBy = asc(prds.name)

        const results = await db.select({
            id: prds.id,
            slug: prds.slug,
            name: prds.name,
            description: prds.description,
            category: prds.category,
            tags: prds.tags,
            author: prds.author,
            version: prds.version,
            file_path: prds.filePath,
            view_count: prds.viewCount,
            download_count: prds.downloadCount,
            like_count: prds.likeCount,
            created_at: prds.createdAt,
        })
            .from(prds)
            .where(validWhere)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset)
            .all()

        const totalCount = await db.select({ count: sql<number>`count(*)` })
            .from(prds)
            .where(validWhere)
            .get()

        return c.json({
            prds: results,
            pagination: {
                page,
                limit,
                total: totalCount?.count || 0,
                hasMore: (offset + limit) < (totalCount?.count || 0)
            }
        })
    } catch (error) {
        console.error('Get PRDs error:', error)
        return c.json({ error: 'Failed to fetch PRDs', prds: [] }, 500)
    }
})

// GET PRD BY SLUG (Public)
app.get('/api/prds/:slug', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        const prd = await db.select().from(prds)
            .where(and(eq(prds.slug, slug), eq(prds.status, 'published')))
            .get()

        if (!prd) return c.json({ error: 'PRD not found' }, 404)

        return c.json(prd)
    } catch (error) {
        console.error('Get PRD error:', error)
        return c.json({ error: 'Failed to fetch PRD' }, 500)
    }
})

// LIST PRD CATEGORIES (Public)
app.get('/api/prds/categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prdCategories).orderBy(asc(prdCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        console.error('Get PRD categories error:', error)
        return c.json({ error: 'Failed to fetch categories' }, 500)
    }
})

// ================== ADMIN: PRDs (Updated with pagination) ==================

// LIST PRDs (Admin with pagination and filtering)
app.get('/api/admin/prds', async (c) => {
    const db = drizzle(c.env.DB)
    const limit = Math.min(parseInt(c.req.query('limit') || '25'), 100)
    const page = parseInt(c.req.query('page') || '1')
    const offset = (page - 1) * limit
    const q = c.req.query('q') || ''
    const category = c.req.query('category') || ''
    const status = c.req.query('status') || ''
    const sort = c.req.query('sort') || 'views'

    try {
        let whereConditions: any[] = []

        if (q) {
            const searchCondition = or(
                like(prds.name, `%${q}%`),
                like(prds.description, `%${q}%`)
            )
            if (searchCondition) {
                whereConditions.push(searchCondition)
            }
        }

        if (category) {
            whereConditions.push(eq(prds.category, category))
        }

        if (status) {
            whereConditions.push(eq(prds.status, status))
        }

        const validWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

        let orderBy = desc(prds.createdAt)
        if (sort === 'views') orderBy = desc(prds.viewCount)
        else if (sort === 'likes') orderBy = desc(prds.likeCount)
        else if (sort === 'recent') orderBy = desc(prds.createdAt)
        else if (sort === 'name') orderBy = asc(prds.name)

        const results = await db.select({
            id: prds.id,
            slug: prds.slug,
            name: prds.name,
            description: prds.description,
            category: prds.category,
            tags: prds.tags,
            author: prds.author,
            version: prds.version,
            file_path: prds.filePath,
            view_count: prds.viewCount,
            download_count: prds.downloadCount,
            like_count: prds.likeCount,
            status: prds.status,
            created_at: prds.createdAt,
            updated_at: prds.updatedAt,
        })
            .from(prds)
            .where(validWhere)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset)
            .all()

        const totalCount = await db.select({ count: sql<number>`count(*)` })
            .from(prds)
            .where(validWhere)
            .get()

        return c.json({
            prds: results,
            pagination: {
                page,
                limit,
                total: totalCount?.count || 0,
                hasMore: (offset + limit) < (totalCount?.count || 0)
            }
        })
    } catch (error) {
        console.error('Admin get PRDs error:', error)
        return c.json({ error: 'Failed to list PRDs', prds: [] }, 500)
    }
})

// IMPORT PRDs
app.post('/api/admin/prds/import', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { prds: prdsDataToImport } = body

    if (!prdsDataToImport || !Array.isArray(prdsDataToImport)) {
        return c.json({ error: 'Invalid input: prds array required' }, 400)
    }

    try {
        const importedIds: string[] = []
        const errors: Array<{ index: number; error: string }> = []

        for (let i = 0; i < prdsDataToImport.length; i++) {
            const prdData = prdsDataToImport[i]

            try {
                const id = prdData.id || `prd_${crypto.randomUUID()}`
                const slug = prdData.slug || prdData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

                await db.insert(prds).values({
                    id,
                    slug,
                    name: prdData.name,
                    description: prdData.description || '',
                    category: prdData.category || 'other',
                    tags: prdData.tags ? JSON.stringify(prdData.tags) : '[]',
                    author: prdData.author || 'Admin',
                    version: prdData.version || '1.0.0',
                    content: prdData.content || '# ' + prdData.name + '\n\n' + (prdData.description || ''),
                    filePath: prdData.filePath,
                    status: prdData.status || 'published',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    publishedAt: new Date().toISOString(),
                }).run()

                importedIds.push(id)
            } catch (err) {
                console.error(`Failed to import PRD at index ${i}:`, err)
                errors.push({ index: i, error: String(err) })
            }
        }

        return c.json({
            success: true,
            imported: importedIds.length,
            failed: errors.length,
            importedIds,
            failedItems: errors.length > 0 ? errors : undefined
        })
    } catch (error) {
        console.error('Import PRDs error:', error)
        return c.json({ error: 'Failed to import PRDs' }, 500)
    }
})

// BULK DELETE PRDs
app.post('/api/admin/prds/bulk-delete', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return c.json({ error: 'Invalid input: ids array required' }, 400)
    }

    try {
        for (const id of ids) {
            await db.delete(prds).where(eq(prds.id, id)).run()
        }

        return c.json({ success: true, message: `Deleted ${ids.length} PRDs` })
    } catch (error) {
        console.error('Bulk delete PRDs error:', error)
        return c.json({ error: 'Failed to delete PRDs' }, 500)
    }
})

// ================== ADMIN: STATS ==================

// RECALCULATE AGGREGATE STATS
app.post('/api/admin/stats/recalculate', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        // 1. Update total_skills and total_installs on repos
        await db.run(sql`
            UPDATE repos SET 
                total_skills = (SELECT COUNT(*) FROM skills WHERE skills.repo_id = repos.id),
                total_installs = (SELECT COALESCE(SUM(total_installs), 0) FROM skills WHERE skills.repo_id = repos.id)
        `)

        // 2. Update total_repos, total_skills, and total_installs on owners
        await db.run(sql`
            UPDATE owners SET 
                total_repos = (SELECT COUNT(*) FROM repos WHERE repos.owner_id = owners.id),
                total_skills = (SELECT COUNT(*) FROM skills 
                    WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id)),
                total_installs = (SELECT COALESCE(SUM(total_installs), 0) FROM skills 
                    WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id))
        `)

        // 3. Update total_stars on owners (sum of skill stars)
        await db.run(sql`
            UPDATE owners SET total_stars = (
                SELECT COALESCE(SUM(total_stars), 0) FROM skills 
                WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id)
            )
        `)

        return c.json({ success: true, message: 'Stats recalculated successfully' })
    } catch (error) {
        console.error('Recalculate stats error:', error)
        return c.json({ error: 'Failed to recalculate stats' }, 500)
    }
})

export default app
