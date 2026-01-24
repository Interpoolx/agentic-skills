import { BRANDING } from './web.config'

export const MARKETPLACE_URL = `https://raw.githubusercontent.com/${BRANDING.github_org}/${BRANDING.github_repo}/refs/heads/main/marketplace.json`

// D1 Database API
export const API_URL = import.meta.env.PROD
    ? `https://api.agenticskills.org`
    : 'http://localhost:8787'

// Fallback API URL if context is missing
export const DEFAULT_API_URL = 'https://api.agenticskills.org';
export const PREVIEW_URL = 'https://agenticskills.org';
