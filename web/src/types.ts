export interface Author {
    name: string
    github?: string
    email?: string
    url?: string
}

export interface Skill {
    owner?: string
    repo?: string
    id: string
    name: string
    description: string
    category: string
    tags: string | string[]
    source?: string
    author?: string | Author
    version: string
    license?: string
    requirements?: string[]
    compatible_agents?: string[]
    keywords?: string[]
    downloads?: number
    rating?: number
    reviews?: number
    githubUrl: string
    githubOwner?: string
    githubRepo?: string
    skill_slug?: string
    skill_md_url?: string
    githubStars?: number
    githubForks?: number
    installCount?: number
    compatibility?: string
    namespace?: string
    platform?: string
    stars?: number
    totalLikes?: number
    totalViews?: number
    totalReviews?: number
    isVerified?: number | boolean
    isFeatured?: number | boolean
    created_at?: string
    updated_at?: string
    createdAt?: string
    updatedAt?: string
    indexedAt?: string
    verified?: boolean
    relatedSkills?: any[]
    reviews_list?: any[]
    source_url?: string
    daily_installs?: number
    weekly_installs?: number
    skill_md_content?: string
    skillMdContent?: string
}

export interface MarketplaceData {
    skills: Skill[]
    categories: string[]
    filters?: {
        by_category?: Record<string, number>
        by_agent?: Record<string, number>
        verified_count?: number
        community_count?: number
    }
    metadata?: {
        total_skills: number
        total_downloads: number
        avg_rating: number
    }
}
