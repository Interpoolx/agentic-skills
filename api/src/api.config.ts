// Shared API Configuration
// This file centralizes all API-related configuration for the project

export const API_CONFIG = {
    // Brand name for dynamic URLs
    brand_name: 'agentic-skills',

    // Local development URL
    local_url: 'http://localhost:8787',

    custom_domain_api: 'api.agenticskills.org',

    // Production URL pattern (uses brand_name)
    get production_url() {
        return `https://${this.custom_domain_api}`;
    },

    // Admin token pattern
    get admin_token() {
        return `${this.brand_name}-default-admin-token`;
    },

    // Storage key for persisting API URL selection
    storage_key: 'project_api_url',
};

export type ApiEnvironment = 'local' | 'production';

export interface ApiEndpointConfig {
    label: string;
    url: string;
    description: string;
}

export const API_ENDPOINTS: Record<ApiEnvironment, ApiEndpointConfig> = {
    local: {
        label: 'Local Development',
        url: API_CONFIG.local_url,
        description: 'Wrangler dev server'
    },
    production: {
        label: 'Production',
        url: API_CONFIG.production_url,
        description: 'Cloudflare Workers production'
    }
};
