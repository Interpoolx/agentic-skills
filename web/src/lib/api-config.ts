// API Configuration for Web Application
// Centralized API URL management

export interface ApiConfig {
    label: string
    url: string
    description: string
}

// Shared values (keep in sync with api/src/api.config.ts)
const BRAND_NAME = 'agentic-skills';
const LOCAL_URL = 'http://localhost:8787';
const PRODUCTION_URL = `https://api.agenticskills.org`;

export const API_CONFIGS: Record<string, ApiConfig> = {
    local: {
        label: 'Local Development',
        url: LOCAL_URL,
        description: 'Wrangler dev server'
    },
    production: {
        label: 'Production',
        url: PRODUCTION_URL,
        description: 'Cloudflare Workers production'
    }
}

const API_STORAGE_KEY = 'project_api_url'

export function getApiUrl(): string {
    if (typeof window === 'undefined') return API_CONFIGS.production.url

    // Check if user has explicitly set a preference
    const savedUrl = localStorage.getItem(API_STORAGE_KEY)
    if (savedUrl) return savedUrl

    // Auto-detect: use local API when running on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return API_CONFIGS.local.url
    }

    return API_CONFIGS.production.url
}

export function setApiUrl(url: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(API_STORAGE_KEY, url)
    }
}

// Helper to get admin token
export function getAdminToken(): string {
    return `${BRAND_NAME}-default-admin-token`;
}

