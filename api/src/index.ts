import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { skillsRouter } from './routes/skills'
import { prdsRouter } from './routes/prds'
import { promptsRouter } from './routes/prompts'
import { adminRouter } from './routes/admin'

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

// Health check
app.get('/', (c) => {
    return c.json({
        name: 'Agentic Skills Registry API (v2)',
        version: '2.0.0',
        status: 'ok',
        endpoints: {
            search: 'GET /api/search?q=query',
            skill: 'GET /api/skills/:owner/:repo/:skill',
            prds: 'GET /api/prds',
            prd: 'GET /api/prds/:slug',
            prdCategories: 'GET /api/prds/categories',
            prompts: 'GET /api/prompts',
            prompt: 'GET /api/prompts/:slug',
            promptsCategories: 'GET /api/prompts/categories',
        }
    })
})

// Mount routers
app.route('/', skillsRouter)
app.route('/', prdsRouter)
app.route('/', promptsRouter)
app.route('/', adminRouter)

export default app
