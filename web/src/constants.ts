import { BRANDING } from './web.config'

export const MARKETPLACE_URL = `https://raw.githubusercontent.com/${BRANDING.github_org}/${BRANDING.github_repo}/refs/heads/main/marketplace.json`

// D1 Database API
export const API_URL = import.meta.env.PROD
    ? `https://${BRANDING.brand_lower_name}-api.rajeshkumarlawyer007.workers.dev`
    : 'http://localhost:8787'
