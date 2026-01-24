import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { skills, owners, repos, prompts, prds, prdCategories, promptCategories, promptCollections, skillSubmissions } from '../db/schema'
import { eq, desc, asc, sql, and, like, or, ne } from 'drizzle-orm'
import { extractSkillFromGithub } from '../utils/github'

interface Env {
    DB: D1Database
    GITHUB_TOKEN?: string
    RALPHY_ADMIN_TOKEN?: string
    ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

export const adminRouter = app

app.use('/api/admin/*', async (c, next) => {
    const adminToken = c.env.RALPHY_ADMIN_TOKEN || 'agentic-skills-default-admin-token'
    const authHeader = c.req.header('Authorization')

    if (authHeader !== `Bearer ${adminToken}`) {
        return c.json({ error: 'Unauthorized. Valid RALPHY_ADMIN_TOKEN required.' }, 401)
    }
    await next()
})

app.get('/api/admin/owners', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(owners).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list owners' }, 500)
    }
})

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
            query = query.where(eq(repos.ownerId, ownerId)) as any
        }

        const result = await query.all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list repos' }, 500)
    }
})

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

app.delete('/api/admin/repos/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        // First delete all skills associated with this repo
        await db.delete(skills).where(eq(skills.repoId, id)).run()

        // Then delete the repo
        await db.delete(repos).where(eq(repos.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete repo' }, 500)
    }
})



app.get('/api/admin/skills', async (c) => {
    const db = drizzle(c.env.DB)
    const query = c.req.query('q') || ''
    const category = c.req.query('category')
    const limit = Math.min(parseInt(c.req.query('limit') || '25'), 10000)
    const page = parseInt(c.req.query('page') || '1')
    const sort = c.req.query('sort') || 'installs'
    const status = c.req.query('status')
    const author = c.req.query('author')
    const owner = c.req.query('owner')
    const repo = c.req.query('repo')
    const offset = (page - 1) * limit

    try {
        let whereConditions: any[] = []

        if (category) whereConditions.push(eq(skills.category, category));
        if (status) whereConditions.push(eq(skills.status, status));
        if (author) whereConditions.push(eq(skills.author, author));

        if (query) {
            const searchCondition = or(
                like(skills.name, `%${query}%`),
                like(skills.shortDescription, `%${query}%`),
                like(skills.tags, `%${query}%`),
                like(skills.author, `%${query}%`),
                like(skills.slug, `%${query}%`)
            );
            if (searchCondition) whereConditions.push(searchCondition);
        }

        // Additional joins/filters handled in query building

        let orderByClause: any = desc(skills.totalInstalls);
        if (sort === 'newest') orderByClause = desc(skills.createdAt);
        else if (sort === 'stars') orderByClause = desc(skills.totalStars);
        else if (sort === 'name') orderByClause = asc(skills.name);
        else if (sort === 'relevance' && !query) orderByClause = desc(skills.totalInstalls);

        const baseQuery = db.select({
            id: skills.id,
            name: skills.name,
            slug: skills.slug,
            shortDescription: skills.shortDescription,
            category: skills.category,
            tags: skills.tags,
            version: skills.version,
            totalInstalls: skills.totalInstalls,
            dailyInstalls: skills.dailyInstalls,
            weeklyInstalls: skills.weeklyInstalls,
            totalStars: skills.totalStars,
            averageRating: skills.averageRating,
            totalReviews: skills.totalReviews,
            isVerified: skills.isVerified,
            isFeatured: skills.isFeatured,
            updatedAt: skills.updatedAt,
            createdAt: skills.createdAt,
            status: skills.status,
            compatibility: skills.compatibility,
            githubRepo: skills.githubRepo,
            githubOwner: skills.githubOwner,
            skillMdContent: skills.skillMdContent,
            sourceUrl: skills.sourceUrl,
            githubUrl: skills.githubUrl,
            ownerSlug: owners.slug,
            repoSlug: repos.slug,
            repoId: skills.repoId
        })
            .from(skills)
            .leftJoin(repos, eq(skills.repoId, repos.id))
            .leftJoin(owners, eq(repos.ownerId, owners.id))

        if (owner) whereConditions.push(eq(owners.slug, owner));
        if (repo) whereConditions.push(eq(repos.slug, repo));

        const validWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const results = await baseQuery
            .where(validWhere)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset)
            .all();

        const flatResults = results.map(r => ({
            ...r,
            github_owner: r.ownerSlug,
            github_repo: r.repoSlug,
            skill_slug: r.slug,
            install_count: r.totalInstalls,
            description: r.shortDescription,
            skill_md_content: r.skillMdContent
        }));

        const totalCount = await db.select({ count: sql<number>`count(*)` })
            .from(skills)
            .leftJoin(repos, eq(skills.repoId, repos.id))
            .leftJoin(owners, eq(repos.ownerId, owners.id))
            .where(validWhere)
            .get();

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
        console.error('Admin skills search error:', error)
        return c.json({ error: 'Search failed', skills: [] }, 500)
    }
})

app.delete('/api/admin/skills/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(skills).where(eq(skills.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete skill' }, 500)
    }
})

app.get('/api/admin/skills/ids', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select({ id: skills.id }).from(skills).all()
        return c.json({ ids: result.map(r => r.id) })
    } catch (error) {
        return c.json({ error: 'Failed to fetch skill IDs' }, 500)
    }
})

app.post('/api/admin/skills/validate', async (c) => {
    const db = drizzle(c.env.DB)
    const { ids } = await c.req.json()

    if (!ids || !Array.isArray(ids)) {
        return c.json({ error: 'Invalid IDs provided' }, 400)
    }

    let validCount = ids.length;
    let invalidCount = 0;

    return c.json({
        processed: ids.length,
        validCount,
        invalidCount
    })
})

app.post('/api/admin/skills', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    const ownerSlug = body.owner || (body.githubUrl ? body.githubUrl.match(/github\.com\/([^\/]+)/)?.[1] : '');
    const repoSlug = body.repo || (body.githubUrl ? body.githubUrl.match(/github\.com\/[^\/]+\/([^\/]+)/)?.[1]?.replace('.git', '') : '');

    if (ownerSlug && (!body.ownerId || body.ownerId === '')) {
        try {
            let owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug.toLowerCase())).get();
            if (!owner) {
                const ownerId = `owner_${crypto.randomUUID()}`;
                await db.insert(owners).values({
                    id: ownerId,
                    slug: ownerSlug.toLowerCase(),
                    name: ownerSlug,
                    githubUrl: `https://github.com/${ownerSlug}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }).run();
                owner = await db.select().from(owners).where(eq(owners.id, ownerId)).get();
            }
            if (owner) body.ownerId = owner.id;
        } catch (e) {
            console.error('Owner resolution failed:', e);
        }
    }

    if (repoSlug && body.ownerId && (!body.repoId || body.repoId === '')) {
        try {
            let repo = await db.select().from(repos).where(and(eq(repos.slug, repoSlug.toLowerCase()), eq(repos.ownerId, body.ownerId))).get();
            if (!repo) {
                const repoId = `repo_${crypto.randomUUID()}`;
                await db.insert(repos).values({
                    id: repoId,
                    slug: repoSlug.toLowerCase(),
                    name: repoSlug,
                    ownerId: body.ownerId,
                    githubUrl: `https://github.com/${ownerSlug}/${repoSlug}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }).run();
                repo = await db.select().from(repos).where(eq(repos.id, repoId)).get();
            }
            if (repo) body.repoId = repo.id;
        } catch (e) {
            console.error('Repo resolution failed:', e);
        }
    }

    if (!body.repoId || !body.name || !body.slug) {
        return c.json({ error: 'Missing required fields: repoId, name, slug (or valid githubUrl)' }, 400)
    }

    try {
        // Check if skill with this slug already exists for this repo
        const existing = await db.select().from(skills).where(and(eq(skills.slug, body.slug), eq(skills.repoId, body.repoId))).get();

        const skillData: any = {
            repoId: body.repoId,
            name: body.name,
            slug: body.slug,
            shortDescription: body.description,
            category: body.category,
            tags: Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags,
            version: body.version,
            status: body.status,
            githubUrl: body.githubUrl,
            sourceUrl: body.sourceUrl, // Add sourceUrl
            githubOwner: body.githubOwner, // Add githubOwner
            githubRepo: body.githubRepo, // Add githubRepo
            author: body.author,
            skillFile: body.skillFile,
            totalInstalls: body.totalInstalls || 0,
            dailyInstalls: body.dailyInstalls || 0,
            weeklyInstalls: body.weeklyInstalls || 0,
            totalStars: body.totalStars || 0,
            averageRating: body.averageRating || 0,
            totalReviews: body.totalReviews || 0,
            isVerified: body.isVerified || 0,
            isFeatured: body.isFeatured || 0,
            compatibility: body.compatibility || '{}',
            skillMdContent: body.skillMdContent,
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            await db.update(skills).set(skillData).where(eq(skills.id, existing.id)).run();
            return c.json({ success: true, id: existing.id, updated: true });
        } else {
            const id = `skill_${crypto.randomUUID()}`;
            await db.insert(skills).values({
                ...skillData,
                id,
                createdAt: new Date().toISOString()
            }).run();
            return c.json({ success: true, id, created: true });
        }
    } catch (error: any) {
        console.error('Create skill error:', error)
        return c.json({ error: error.message || 'Failed to create skill' }, 500)
    }
})

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
        if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl;
        if (body.dailyInstalls !== undefined) updateData.dailyInstalls = body.dailyInstalls;
        if (body.weeklyInstalls !== undefined) updateData.weeklyInstalls = body.weeklyInstalls;
        if (body.githubOwner !== undefined) updateData.githubOwner = body.githubOwner;
        if (body.githubRepo !== undefined) updateData.githubRepo = body.githubRepo;
        if (body.skillMdContent !== undefined) updateData.skillMdContent = body.skillMdContent;

        // Support direct owner/repo slugs in update
        if (body.owner || body.repo) {
            const ownerSlug = body.owner || (body.githubUrl?.match(/github\.com\/([^\/]+)/)?.[1]);
            let targetOwnerId = body.ownerId;

            if (ownerSlug) {
                let owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug.toLowerCase())).get();
                if (!owner) {
                    const ownerId = `owner_${crypto.randomUUID()}`;
                    await db.insert(owners).values({
                        id: ownerId,
                        slug: ownerSlug.toLowerCase(),
                        name: ownerSlug,
                        githubUrl: `https://github.com/${ownerSlug}`,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }).run();
                    owner = await db.select().from(owners).where(eq(owners.id, ownerId)).get();
                }
                if (owner) targetOwnerId = owner.id;
            }

            const repoSlug = body.repo || (body.githubUrl?.match(/github\.com\/[^\/]+\/([^\/]+)/)?.[1]?.replace('.git', ''));
            if (repoSlug && targetOwnerId) {
                let repo = await db.select().from(repos).where(and(eq(repos.slug, repoSlug.toLowerCase()), eq(repos.ownerId, targetOwnerId))).get();
                if (!repo) {
                    const repoId = `repo_${crypto.randomUUID()}`;
                    await db.insert(repos).values({
                        id: repoId,
                        slug: repoSlug.toLowerCase(),
                        name: repoSlug,
                        ownerId: targetOwnerId,
                        githubUrl: `https://github.com/${ownerSlug}/${repoSlug}`,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }).run();
                    repo = await db.select().from(repos).where(eq(repos.id, repoId)).get();
                }
                if (repo) updateData.repoId = repo.id;
            }
        }

        await db.update(skills).set(updateData).where(eq(skills.id, id)).run();
        return c.json({ success: true })
    } catch (error: any) {
        console.error('Update skill error:', error)
        return c.json({ error: error.message || 'Failed to update skill' }, 500)
    }
})

app.get('/api/admin/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prompts).orderBy(desc(prompts.createdAt)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list prompts' }, 500)
    }
})

app.post('/api/admin/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

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

// Alternative endpoint for frontend compatibility (plural path) - MUST be before :id
app.get('/api/admin/prds/categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prdCategories).orderBy(asc(prdCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list PRD categories' }, 500)
    }
})

app.post('/api/admin/prds/categories', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.name) {
        return c.json({ error: 'Missing required fields: name' }, 400)
    }

    try {
        const id = body.id || body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
        await db.insert(prdCategories).values({
            id,
            slug: id,
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

app.delete('/api/admin/prds/categories/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(prdCategories).where(eq(prdCategories.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete category' }, 500)
    }
})

// Dedicated single PRD endpoint (for admin editor) - MUST be after categories
app.get('/api/admin/prd/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')

    try {
        const prd = await db.select().from(prds)
            .where(eq(prds.id, id))
            .get()

        if (!prd) return c.json({ error: 'PRD not found' }, 404)

        return c.json(prd)
    } catch (error) {
        console.error('Admin get PRD error:', error)
        return c.json({ error: 'Failed to fetch PRD' }, 500)
    }
})

app.patch('/api/admin/prd/:id', async (c) => {
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

// Get single PRD for admin (returns content for editing)
app.get('/api/admin/prds/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')

    try {
        const prd = await db.select().from(prds)
            .where(eq(prds.id, id))
            .get()

        if (!prd) return c.json({ error: 'PRD not found' }, 404)

        return c.json(prd)
    } catch (error) {
        console.error('Admin get PRD error:', error)
        return c.json({ error: 'Failed to fetch PRD' }, 500)
    }
})

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

app.get('/api/admin/prd-categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prdCategories).orderBy(asc(prdCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list PRD categories' }, 500)
    }
})

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

// Alternative endpoint for frontend compatibility (plural path)
app.get('/api/admin/prds/categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(prdCategories).orderBy(asc(prdCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list PRD categories' }, 500)
    }
})

app.post('/api/admin/prds/categories', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.name) {
        return c.json({ error: 'Missing required fields: name' }, 400)
    }

    try {
        const id = body.id || body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
        await db.insert(prdCategories).values({
            id,
            slug: id,
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

app.delete('/api/admin/prds/categories/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(prdCategories).where(eq(prdCategories.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete category' }, 500)
    }
})

app.post('/api/admin/stats/recalculate', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        await db.run(sql`
            UPDATE repos SET
                total_skills = (SELECT COUNT(*) FROM skills WHERE skills.repo_id = repos.id),
                total_installs = (SELECT COALESCE(SUM(total_installs), 0) FROM skills WHERE skills.repo_id = repos.id)
        `)

        await db.run(sql`
            UPDATE owners SET
                total_repos = (SELECT COUNT(*) FROM repos WHERE repos.owner_id = owners.id),
                total_skills = (SELECT COUNT(*) FROM skills
                    WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id)),
                total_installs = (SELECT COALESCE(SUM(total_installs), 0) FROM skills
                    WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id))
        `)

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

// ================== ADMIN: PROMPTS CRUD ==================

// LIST PROMPTS (Admin)
app.get('/api/admin/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    const limit = Math.min(parseInt(c.req.query('limit') || '25'), 100)
    const page = parseInt(c.req.query('page') || '1')
    const offset = (page - 1) * limit
    const q = c.req.query('q') || ''
    const category = c.req.query('category')
    const status = c.req.query('status')
    const sort = c.req.query('sort') || 'copies'

    try {
        let whereConditions: any[] = []

        if (q) {
            const searchCondition = or(
                like(prompts.title, `%${q}%`),
                like(prompts.description, `%${q}%`)
            )
            if (searchCondition) whereConditions.push(searchCondition)
        }

        if (category) {
            whereConditions.push(eq(prompts.category, category))
        }

        if (status) {
            whereConditions.push(eq(prompts.status, status))
        }

        const validWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

        let orderBy = desc(prompts.copyCount)
        if (sort === 'views') orderBy = desc(prompts.viewCount)
        else if (sort === 'likes') orderBy = desc(prompts.favoriteCount)
        else if (sort === 'recent') orderBy = desc(prompts.createdAt)
        else if (sort === 'rating') orderBy = desc(prompts.averageRating)
        else if (sort === 'success') orderBy = desc(prompts.successRate)

        const results = await db.select()
            .from(prompts)
            .where(validWhere)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset)
            .all()

        const totalCount = await db.select({ count: sql<number>`count(*)` })
            .from(prompts)
            .where(validWhere)
            .get()

        return c.json({
            prompts: results,
            pagination: {
                page,
                limit,
                total: totalCount?.count || 0,
                hasMore: (offset + limit) < (totalCount?.count || 0)
            }
        })
    } catch (error) {
        console.error('Admin get prompts error:', error)
        return c.json({ error: 'Failed to list prompts', prompts: [] }, 500)
    }
})

// CREATE PROMPT
app.post('/api/admin/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.title || !body.promptText) {
        return c.json({ error: 'Missing required fields: title, promptText' }, 400)
    }

    try {
        const id = body.id || `prompt_${crypto.randomUUID()}`
        await db.insert(prompts).values({
            id,
            slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: body.title,
            description: body.description || '',
            promptText: body.promptText,
            systemPrompt: body.systemPrompt,
            category: body.category || 'general',
            tags: body.tags ? JSON.stringify(body.tags) : '[]',
            useCases: body.useCases ? JSON.stringify(body.useCases) : '[]',
            modelCompatibility: body.modelCompatibility ? JSON.stringify(body.modelCompatibility) : '{}',
            recommendedModel: body.recommendedModel || '',
            promptType: body.promptType || 'instruction',
            complexity: body.complexity || 'intermediate',
            expectedOutputFormat: body.expectedOutputFormat || 'text',
            variables: body.variables ? JSON.stringify(body.variables) : '[]',
            hasVariables: body.hasVariables || (body.variables?.length > 0 ? 1 : 0),
            author: body.author || 'Admin',
            version: body.version || '1.0.0',
            status: body.status || 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create prompt error:', error)
        return c.json({ error: 'Failed to create prompt' }, 500)
    }
})

// ================== ADMIN: PROMPT CATEGORIES CRUD ==================
// NOTE: These routes MUST come BEFORE /api/admin/prompts/:id routes
// Otherwise :id will catch "categories" as a parameter

// LIST PROMPT CATEGORIES (Admin)
app.get('/api/admin/prompts/categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(promptCategories).orderBy(asc(promptCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list prompt categories' }, 500)
    }
})

// CREATE PROMPT CATEGORY
app.post('/api/admin/prompts/categories', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.name) {
        return c.json({ error: 'Missing required fields: name' }, 400)
    }

    try {
        const id = body.id || body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
        await db.insert(promptCategories).values({
            id,
            slug: id,
            name: body.name,
            description: body.description || '',
            icon: body.icon || '📝',
            color: body.color || '#8b5cf6',
            promptCount: 0,
            sortOrder: body.sortOrder || 0
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create prompt category error:', error)
        return c.json({ error: 'Failed to create category' }, 500)
    }
})

// UPDATE PROMPT CATEGORY
app.patch('/api/admin/prompts/categories/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.icon !== undefined) updateData.icon = body.icon
        if (body.color !== undefined) updateData.color = body.color
        if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder

        await db.update(promptCategories).set(updateData).where(eq(promptCategories.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        console.error('Update prompt category error:', error)
        return c.json({ error: 'Failed to update category' }, 500)
    }
})

// DELETE PROMPT CATEGORY
app.delete('/api/admin/prompts/categories/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(promptCategories).where(eq(promptCategories.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete category' }, 500)
    }
})

// GET SINGLE PROMPT (Admin)
app.get('/api/admin/prompts/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')

    try {
        const prompt = await db.select().from(prompts)
            .where(eq(prompts.id, id))
            .get()

        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        return c.json(prompt)
    } catch (error) {
        console.error('Admin get prompt error:', error)
        return c.json({ error: 'Failed to fetch prompt' }, 500)
    }
})

// UPDATE PROMPT
app.patch('/api/admin/prompts/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        const updateData: any = {
            updatedAt: new Date().toISOString()
        }

        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.promptText !== undefined) updateData.promptText = body.promptText
        if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt
        if (body.category !== undefined) updateData.category = body.category
        if (body.tags !== undefined) updateData.tags = typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags)
        if (body.modelCompatibility !== undefined) updateData.modelCompatibility = typeof body.modelCompatibility === 'string' ? body.modelCompatibility : JSON.stringify(body.modelCompatibility)
        if (body.recommendedModel !== undefined) updateData.recommendedModel = body.recommendedModel
        if (body.promptType !== undefined) updateData.promptType = body.promptType
        if (body.complexity !== undefined) updateData.complexity = body.complexity
        if (body.expectedOutputFormat !== undefined) updateData.expectedOutputFormat = body.expectedOutputFormat
        if (body.status !== undefined) updateData.status = body.status
        if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured

        await db.update(prompts).set(updateData).where(eq(prompts.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        console.error('Update prompt error:', error)
        return c.json({ error: 'Failed to update prompt' }, 500)
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
        console.error('Delete prompt error:', error)
        return c.json({ error: 'Failed to delete prompt' }, 500)
    }
})

// BULK DELETE PROMPTS
app.post('/api/admin/prompts/bulk-delete', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return c.json({ error: 'Invalid input: ids array required' }, 400)
    }

    try {
        for (const id of ids) {
            await db.delete(prompts).where(eq(prompts.id, id)).run()
        }

        return c.json({ success: true, message: `Deleted ${ids.length} prompts` })
    } catch (error) {
        console.error('Bulk delete prompts error:', error)
        return c.json({ error: 'Failed to delete prompts' }, 500)
    }
})



// ================== ADMIN: PROMPT COLLECTIONS CRUD ==================

// LIST PROMPT COLLECTIONS (Admin)
app.get('/api/admin/prompts/collections', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select()
            .from(promptCollections)
            .orderBy(desc(promptCollections.followerCount))
            .all()
        return c.json(result)
    } catch (error) {
        return c.json({ error: 'Failed to list collections' }, 500)
    }
})

// CREATE PROMPT COLLECTION
app.post('/api/admin/prompts/collections', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()

    if (!body.name || !body.creatorId) {
        return c.json({ error: 'Missing required fields: name, creatorId' }, 400)
    }

    try {
        const id = body.id || `collection_${crypto.randomUUID()}`
        await db.insert(promptCollections).values({
            id,
            slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: body.name,
            description: body.description || '',
            creatorId: body.creatorId,
            isPublic: body.isPublic !== undefined ? body.isPublic : 1,
            tags: body.tags ? JSON.stringify(body.tags) : '[]',
            coverImage: body.coverImage,
            promptCount: 0,
            followerCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, id })
    } catch (error) {
        console.error('Create collection error:', error)
        return c.json({ error: 'Failed to create collection' }, 500)
    }
})

// DELETE PROMPT COLLECTION
app.delete('/api/admin/prompts/collections/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(promptCollections).where(eq(promptCollections.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete collection' }, 500)
    }
})

app.post('/api/admin/stats/recalculate', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        await db.run(sql`
            UPDATE repos SET
                total_skills = (SELECT COUNT(*) FROM skills WHERE skills.repo_id = repos.id),
                total_installs = (SELECT COALESCE(SUM(total_installs), 0) FROM skills WHERE skills.repo_id = repos.id)
        `)

        await db.run(sql`
            UPDATE owners SET
                total_repos = (SELECT COUNT(*) FROM repos WHERE repos.owner_id = owners.id),
                total_skills = (SELECT COUNT(*) FROM skills
                    WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id)),
                total_installs = (SELECT COALESCE(SUM(total_installs), 0) FROM skills
                    WHERE skills.repo_id IN (SELECT id FROM repos WHERE repos.owner_id = owners.id))
        `)

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

// Import skills from JSON file upload
app.post('/api/admin/import-json', async (c) => {
    const db = drizzle(c.env.DB)
    const body = await c.req.json()
    const { skills: skillsToImport } = body

    if (!skillsToImport || !Array.isArray(skillsToImport) || skillsToImport.length === 0) {
        return c.json({ error: 'Invalid input: skills array required' }, 400)
    }

    const results = {
        imported: 0,
        duplicates: 0,
        errors: 0,
        ownersCreated: 0,
        reposCreated: 0,
        errorDetails: [] as string[]
    }

    const ownerCache = new Map<string, any>()
    const repoCache = new Map<string, any>()

    for (const skillData of skillsToImport) {
        try {
            // Extract owner and repo from the skill data
            const ownerSlug = (skillData.owner || '').toLowerCase();
            const repoSlug = (skillData.repo || '').toLowerCase();
            const skillSlug = (skillData.skill_slug || skillData.slug || skillData.id || skillData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '').toLowerCase();

            if (!ownerSlug || !repoSlug || !skillSlug) {
                results.errors++;
                results.errorDetails.push(`Missing required field for skill: ${skillData.name || 'unknown'}. Need owner, repo, and slug/name.`);
                continue;
            }

            // 1. Find or create owner (with local cache)
            let owner = ownerCache.get(ownerSlug);
            if (!owner) {
                owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get();
                if (!owner) {
                    const ownerId = `owner_${crypto.randomUUID()}`;
                    await db.insert(owners).values({
                        id: ownerId,
                        slug: ownerSlug,
                        name: ownerSlug,
                        githubUrl: `https://github.com/${ownerSlug}`,
                        createdAt: new Date().toISOString()
                    }).run();
                    owner = { id: ownerId, slug: ownerSlug };
                    results.ownersCreated++;
                }
                ownerCache.set(ownerSlug, owner);
            }

            // 2. Find or create repo (with local cache)
            const repoCacheKey = `${ownerSlug}/${repoSlug}`;
            let repo = repoCache.get(repoCacheKey);
            if (!repo) {
                repo = await db.select().from(repos)
                    .where(and(eq(repos.slug, repoSlug), eq(repos.ownerId, owner.id)))
                    .get();

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
                    repo = { id: repoId, slug: repoSlug, ownerId: owner.id };
                    results.reposCreated++;
                }
                repoCache.set(repoCacheKey, repo);
            }

            // 3. Check for existing skill by ID or slug within this repo
            // We don't cache skills as they are usually unique per record in the import
            const existingSkill = await db.select()
                .from(skills)
                .where(
                    or(
                        eq(skills.id, skillData.id || ''),
                        and(eq(skills.slug, skillSlug), eq(skills.repoId, repo.id))
                    )
                )
                .get();

            // Prepare common skill data
            const tags = skillData.tags || skillData.keywords || [];
            const skillValues = {
                repoId: repo.id,
                name: skillData.name || skillSlug,
                slug: skillSlug,
                shortDescription: skillData.short_description || skillData.description || '',
                category: skillData.category || 'general',
                tags: Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? tags : JSON.stringify([])),
                version: skillData.version || '1.0.0',
                status: skillData.status || 'published',
                githubUrl: skillData.github_url || skillData.source || `https://github.com/${ownerSlug}/${repoSlug}`,
                author: typeof skillData.author === 'object' ? skillData.author?.name : (skillData.author || ownerSlug),
                skillFile: skillData.skill_file || skillData.skill_md_url || 'SKILL.md',
                totalInstalls: parseInt(skillData.total_installs || skillData.downloads || 0),
                totalStars: parseInt(skillData.total_stars || 0),
                averageRating: parseFloat(skillData.average_rating || skillData.rating || 0),
                totalReviews: parseInt(skillData.total_reviews || skillData.reviews || 0),
                isVerified: skillData.is_verified || (skillData.verified ? 1 : 0),
                isFeatured: skillData.is_featured || 0,
                compatibility: typeof skillData.compatibility === 'string' ? skillData.compatibility : JSON.stringify({
                    agents: skillData.compatible_agents || (skillData.compatibility?.agents) || ['claude-code', 'cursor'],
                    requirements: skillData.requirements || (skillData.compatibility?.requirements) || []
                }),
                sourceUrl: skillData.source_url || skillData.sourceUrl || null,
                dailyInstalls: parseInt(skillData.daily_installs) || 0,
                weeklyInstalls: parseInt(skillData.weekly_installs) || 0,
                githubOwner: ownerSlug,
                githubRepo: skillData.github_repo || null,
                skillMdContent: skillData.skill_md_content || null,
                updatedAt: new Date().toISOString()
            };

            if (existingSkill) {
                // Update existing skill
                await db.update(skills)
                    .set(skillValues)
                    .where(eq(skills.id, existingSkill.id))
                    .run();
                results.duplicates++;
            } else {
                // Insert new skill
                const skillId = skillData.id || `skill_${crypto.randomUUID()}`;
                await db.insert(skills).values({
                    id: skillId,
                    ...skillValues,
                    createdAt: skillData.created_at || new Date().toISOString()
                }).run();
                results.imported++;
            }
        } catch (err: any) {
            results.errors++;
            results.errorDetails.push(`Error importing ${skillData.name || 'unknown'}: ${err.message}`);
        }
    }

    return c.json(results);
})

// ============================================================================
// SKILL SUBMISSIONS MANAGEMENT
// ============================================================================

app.get('/api/admin/submissions', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(skillSubmissions).orderBy(desc(skillSubmissions.submittedAt)).all()
        return c.json(result)
    } catch (error) {
        console.error('List submissions error:', error)
        return c.json({ error: 'Failed to list submissions' }, 500)
    }
})

app.post('/api/admin/submissions/:id/approve', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        // Get the submission
        const submission = await db.select().from(skillSubmissions).where(eq(skillSubmissions.id, id)).get()
        if (!submission) {
            return c.json({ error: 'Submission not found' }, 404)
        }

        // Parse GitHub URL to get owner/repo
        const match = submission.githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
        if (!match) {
            return c.json({ error: 'Invalid GitHub URL' }, 400)
        }

        const ownerSlug = match[1]
        const repoSlug = match[2].replace(/\.git$/, '')

        // Create or get owner
        let owner = await db.select().from(owners).where(eq(owners.slug, ownerSlug)).get()
        if (!owner) {
            const ownerId = `owner_${crypto.randomUUID()}`
            await db.insert(owners).values({
                id: ownerId,
                slug: ownerSlug,
                name: ownerSlug,
                githubUrl: `https://github.com/${ownerSlug}`,
                createdAt: new Date().toISOString()
            }).run()
            owner = await db.select().from(owners).where(eq(owners.id, ownerId)).get()
        }

        if (!owner) {
            return c.json({ error: 'Failed to create owner' }, 500)
        }

        // Create or get repo
        let repo = await db.select().from(repos).where(and(eq(repos.ownerId, owner.id), eq(repos.slug, repoSlug))).get()
        if (!repo) {
            const repoId = `repo_${crypto.randomUUID()}`
            await db.insert(repos).values({
                id: repoId,
                ownerId: owner.id,
                slug: repoSlug,
                name: repoSlug,
                githubUrl: `https://github.com/${ownerSlug}/${repoSlug}`,
                createdAt: new Date().toISOString()
            }).run()
            repo = await db.select().from(repos).where(eq(repos.id, repoId)).get()
        }

        if (!repo) {
            return c.json({ error: 'Failed to create repo' }, 500)
        }

        // Create skill
        const skillId = `skill_${crypto.randomUUID()}`
        const skillSlug = body.id || repoSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-')

        await db.insert(skills).values({
            id: skillId,
            repoId: repo.id,
            slug: skillSlug,
            name: body.name || repoSlug,
            category: body.category || 'general',
            githubUrl: submission.githubUrl,
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        // Update submission status
        await db.update(skillSubmissions).set({
            status: 'approved',
            reviewedAt: new Date().toISOString()
        }).where(eq(skillSubmissions.id, id)).run()

        return c.json({ success: true, skillId })
    } catch (error: any) {
        console.error('Approve submission error:', error)
        return c.json({ error: error.message || 'Failed to approve submission' }, 500)
    }
})

app.post('/api/admin/submissions/:id/reject', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    try {
        await db.update(skillSubmissions).set({
            status: 'rejected',
            reviewNotes: body.notes || '',
            reviewedAt: new Date().toISOString()
        }).where(eq(skillSubmissions.id, id)).run()

        return c.json({ success: true })
    } catch (error) {
        console.error('Reject submission error:', error)
        return c.json({ error: 'Failed to reject submission' }, 500)
    }
})

app.delete('/api/admin/submissions/:id', async (c) => {
    const db = drizzle(c.env.DB)
    const id = c.req.param('id')
    try {
        await db.delete(skillSubmissions).where(eq(skillSubmissions.id, id)).run()
        return c.json({ success: true })
    } catch (error) {
        return c.json({ error: 'Failed to delete submission' }, 500)
    }
})
