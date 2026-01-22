import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { prds, prdCategories } from '../db/schema'
import { eq, ne, like, desc, asc, sql, or, and } from 'drizzle-orm'

interface Env {
    DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

export const prdsRouter = app

const prdRouter = new Hono<{ Bindings: Env }>()

// PRD categories MUST be before :slug parameter
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

// Single PRD (singular path to avoid route conflict)
app.get('/api/prd/:slug', async (c) => {
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

// Track PRD view
app.post('/api/prd/:slug/view', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        await db.update(prds)
            .set({ viewCount: sql`view_count + 1` })
            .where(eq(prds.slug, slug))
            .run()
        return c.json({ success: true })
    } catch (error) {
        console.error('Track PRD view error:', error)
        return c.json({ error: 'Failed to track view' }, 500)
    }
})

// Toggle PRD like
app.post('/api/prd/:slug/like', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        await db.update(prds)
            .set({ likeCount: sql`like_count + 1` })
            .where(eq(prds.slug, slug))
            .run()
        return c.json({ success: true })
    } catch (error) {
        console.error('Like PRD error:', error)
        return c.json({ error: 'Failed to like PRD' }, 500)
    }
})

// Track PRD download
app.post('/api/prd/:slug/download', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        await db.update(prds)
            .set({ downloadCount: sql`download_count + 1` })
            .where(eq(prds.slug, slug))
            .run()
        return c.json({ success: true })
    } catch (error) {
        console.error('Track PRD download error:', error)
        return c.json({ error: 'Failed to track download' }, 500)
    }
})
