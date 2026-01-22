import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import {
    prompts,
    promptCategories,
    promptViews,
    promptCopies,
    promptReviews,
    promptVariables,
    promptCollections,
    promptFavorites,
    promptUsageReports
} from '../db/schema'
import { eq, ne, like, desc, asc, sql, or, and } from 'drizzle-orm'

interface Env {
    DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

export const promptsRouter = app

// ================== PUBLIC: PROMPTS LISTING ==================

// LIST PROMPTS (Public with pagination and filtering)
app.get('/api/prompts', async (c) => {
    const db = drizzle(c.env.DB)
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
    const page = parseInt(c.req.query('page') || '1')
    const offset = (page - 1) * limit
    const q = c.req.query('q') || ''
    const category = c.req.query('category')
    const promptType = c.req.query('type')
    const complexity = c.req.query('complexity')
    const sort = c.req.query('sort') || 'copies'

    try {
        let whereConditions = [eq(prompts.status, 'published')]

        if (category) {
            whereConditions.push(eq(prompts.category, category))
        }

        if (promptType) {
            whereConditions.push(eq(prompts.promptType, promptType))
        }

        if (complexity) {
            whereConditions.push(eq(prompts.complexity, complexity))
        }

        if (q) {
            const searchCondition = or(
                like(prompts.title, `%${q}%`),
                like(prompts.description, `%${q}%`),
                like(prompts.tags, `%${q}%`)
            )
            if (searchCondition) {
                whereConditions.push(searchCondition)
            }
        }

        const validWhere = and(...whereConditions)

        let orderBy = desc(prompts.copyCount)
        if (sort === 'views') orderBy = desc(prompts.viewCount)
        else if (sort === 'likes') orderBy = desc(prompts.favoriteCount)
        else if (sort === 'recent') orderBy = desc(prompts.createdAt)
        else if (sort === 'rating') orderBy = desc(prompts.averageRating)
        else if (sort === 'success') orderBy = desc(prompts.successRate)

        const results = await db.select({
            id: prompts.id,
            slug: prompts.slug,
            title: prompts.title,
            description: prompts.description,
            category: prompts.category,
            tags: prompts.tags,
            promptType: prompts.promptType,
            complexity: prompts.complexity,
            modelCompatibility: prompts.modelCompatibility,
            recommendedModel: prompts.recommendedModel,
            author: prompts.author,
            viewCount: prompts.viewCount,
            copyCount: prompts.copyCount,
            useCount: prompts.useCount,
            favoriteCount: prompts.favoriteCount,
            averageRating: prompts.averageRating,
            successRate: prompts.successRate,
            isFeatured: prompts.isFeatured,
            createdAt: prompts.createdAt,
        })
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
        console.error('Get prompts error:', error)
        return c.json({ error: 'Failed to fetch prompts', prompts: [] }, 500)
    }
})

// GET PROMPT CATEGORIES (Public)
app.get('/api/prompts/categories', async (c) => {
    const db = drizzle(c.env.DB)
    try {
        const result = await db.select().from(promptCategories).orderBy(asc(promptCategories.sortOrder)).all()
        return c.json(result)
    } catch (error) {
        console.error('Get prompt categories error:', error)
        return c.json({ error: 'Failed to fetch categories' }, 500)
    }
})

// ================== PUBLIC: SINGLE PROMPT ==================

// GET SINGLE PROMPT (Public - with variables and related data)
app.get('/api/prompts/:slug', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        const prompt = await db.select().from(prompts)
            .where(and(eq(prompts.slug, slug), eq(prompts.status, 'published')))
            .get()

        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        return c.json(prompt)
    } catch (error) {
        console.error('Get prompt error:', error)
        return c.json({ error: 'Failed to fetch prompt' }, 500)
    }
})

// GET PROMPT VARIABLES (Public - for template building)
app.get('/api/prompts/:slug/variables', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        const prompt = await db.select().from(prompts)
            .where(eq(prompts.slug, slug))
            .get()

        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        const variables = await db.select()
            .from(promptVariables)
            .where(eq(promptVariables.promptId, prompt.id))
            .orderBy(asc(promptVariables.sortOrder))
            .all()

        return c.json({
            promptId: prompt.id,
            hasVariables: prompt.hasVariables,
            variables: variables
        })
    } catch (error) {
        console.error('Get prompt variables error:', error)
        return c.json({ error: 'Failed to fetch prompt variables' }, 500)
    }
})

// ================== PUBLIC: ENGAGEMENT TRACKING ==================

// TRACK PROMPT VIEW
app.post('/api/prompts/:slug/view', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')

    try {
        const prompt = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.slug, slug)).get()
        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        await db.update(prompts)
            .set({ viewCount: sql`view_count + 1` })
            .where(eq(prompts.id, prompt.id))
            .run()

        return c.json({ success: true })
    } catch (error) {
        console.error('Track prompt view error:', error)
        return c.json({ error: 'Failed to track view' }, 500)
    }
})

// TRACK PROMPT COPY
app.post('/api/prompts/:slug/copy', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')
    const body = await c.req.json()

    try {
        const prompt = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.slug, slug)).get()
        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        const copyId = `copy_${crypto.randomUUID()}`
        await db.insert(promptCopies).values({
            id: copyId,
            promptId: prompt.id,
            copiedVariant: body.variant || 'original',
            copiedAt: new Date().toISOString()
        }).run()

        await db.update(prompts)
            .set({ copyCount: sql`copy_count + 1` })
            .where(eq(prompts.id, prompt.id))
            .run()

        return c.json({ success: true, copyId })
    } catch (error) {
        console.error('Copy prompt error:', error)
        return c.json({ error: 'Failed to track copy' }, 500)
    }
})

// TOGGLE PROMPT FAVORITE
app.post('/api/prompts/:slug/favorite', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')
    const body = await c.req.json()
    const { userId, collectionName } = body

    try {
        const prompt = await db.select({ id: prompts.id, favoriteCount: prompts.favoriteCount }).from(prompts).where(eq(prompts.slug, slug)).get()
        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        // For anonymous users or when userId is 'anonymous', just increment the count
        // Don't try to create a favorite record (would fail foreign key constraint)
        if (!userId || userId === 'anonymous') {
            await db.update(prompts)
                .set({ favoriteCount: sql`favorite_count + 1` })
                .where(eq(prompts.id, prompt.id))
                .run()
            return c.json({ success: true, anonymous: true })
        }

        // For authenticated users, try to create the favorite record
        const favoriteId = `fav_${crypto.randomUUID()}`
        try {
            await db.insert(promptFavorites).values({
                id: favoriteId,
                promptId: prompt.id,
                userId,
                collectionName: collectionName || 'Default',
                createdAt: new Date().toISOString()
            }).run()

            await db.update(prompts)
                .set({ favoriteCount: sql`favorite_count + 1` })
                .where(eq(prompts.id, prompt.id))
                .run()

            return c.json({ success: true, favoriteId })
        } catch (insertError) {
            // If user already favorited or foreign key fails, just increment count
            await db.update(prompts)
                .set({ favoriteCount: sql`favorite_count + 1` })
                .where(eq(prompts.id, prompt.id))
                .run()
            return c.json({ success: true, countOnly: true })
        }
    } catch (error) {
        console.error('Favorite prompt error:', error)
        return c.json({ error: 'Failed to favorite prompt' }, 500)
    }
})


// REPORT PROMPT USAGE
app.post('/api/prompts/:slug/usage', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')
    const body = await c.req.json()
    const { userId, modelUsed, wasSuccessful, feedback, modifications } = body

    if (!userId || !modelUsed) return c.json({ error: 'User ID and model used are required' }, 400)

    try {
        const prompt = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.slug, slug)).get()
        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        const reportId = `usage_${crypto.randomUUID()}`
        await db.insert(promptUsageReports).values({
            id: reportId,
            promptId: prompt.id,
            userId,
            modelUsed,
            wasSuccessful,
            feedback,
            modifications,
            usedAt: new Date().toISOString()
        }).run()

        if (wasSuccessful === 1) {
            await db.update(prompts)
                .set({ useCount: sql`use_count + 1` })
                .where(eq(prompts.id, prompt.id))
                .run()
        }

        return c.json({ success: true, reportId })
    } catch (error) {
        console.error('Report prompt usage error:', error)
        return c.json({ error: 'Failed to report usage' }, 500)
    }
})

// ================== PUBLIC: PROMPT REVIEWS ==================

// GET PROMPT REVIEWS
app.get('/api/prompts/:slug/reviews', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')
    const limit = parseInt(c.req.query('limit') || '10')

    try {
        const prompt = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.slug, slug)).get()
        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        const reviews = await db.select()
            .from(promptReviews)
            .where(and(eq(promptReviews.promptId, prompt.id), eq(promptReviews.status, 'published')))
            .orderBy(desc(promptReviews.createdAt))
            .limit(limit)
            .all()

        return c.json({ reviews })
    } catch (error) {
        console.error('Get prompt reviews error:', error)
        return c.json({ error: 'Failed to fetch reviews' }, 500)
    }
})

// ADD PROMPT REVIEW
app.post('/api/prompts/:slug/reviews', async (c) => {
    const db = drizzle(c.env.DB)
    const slug = c.req.param('slug')
    const body = await c.req.json()
    const { userId, rating, title, reviewText } = body

    if (!userId || !rating || !reviewText) {
        return c.json({ error: 'User ID, rating, and review text are required' }, 400)
    }

    try {
        const prompt = await db.select({ id: prompts.id }).from(prompts).where(eq(prompts.slug, slug)).get()
        if (!prompt) return c.json({ error: 'Prompt not found' }, 404)

        const reviewId = `review_${crypto.randomUUID()}`
        await db.insert(promptReviews).values({
            id: reviewId,
            promptId: prompt.id,
            userId,
            rating,
            title,
            reviewText,
            clarityRating: body.clarityRating,
            effectivenessRating: body.effectivenessRating,
            helpfulCount: 0,
            unhelpfulCount: 0,
            status: 'published',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }).run()

        return c.json({ success: true, reviewId })
    } catch (error) {
        console.error('Add prompt review error:', error)
        return c.json({ error: 'Failed to add review' }, 500)
    }
})

// ================== PUBLIC: PROMPT COLLECTIONS ==================

// LIST PROMPT COLLECTIONS (Public - only featured ones)
app.get('/api/prompts/collections', async (c) => {
    const db = drizzle(c.env.DB)
    const limit = parseInt(c.req.query('limit') || '20')

    try {
        const collections = await db.select()
            .from(promptCollections)
            .where(and(eq(promptCollections.isPublic, 1), eq(promptCollections.isFeatured, 1)))
            .orderBy(desc(promptCollections.followerCount))
            .limit(limit)
            .all()

        return c.json({ collections })
    } catch (error) {
        console.error('Get prompt collections error:', error)
        return c.json({ error: 'Failed to fetch collections' }, 500)
    }
})
