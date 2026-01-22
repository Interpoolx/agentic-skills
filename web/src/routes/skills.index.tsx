import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SkillsList } from '../components/SkillsList'
import type { MarketplaceData, Skill } from '../types'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/skills/')({
    component: SkillsPage,
})

function SkillsPage() {
    const [page, setPage] = useState(0)
    const [limit] = useState(50)
    const [searchQuery, setSearchQuery] = useState('')
    const [category] = useState<string | null>(null)
    const [provider] = useState<string | null>(null)
    const [sort, setSort] = useState<'installs' | 'recent' | 'name'>('installs')

    // Fetch skills with caching and server-side filtering
    const { data: searchData, isLoading } = useQuery({
        queryKey: ['public-skills', page, limit, searchQuery, category, provider, sort],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: limit.toString(),
                page: (page + 1).toString(),
                q: searchQuery,
                sort: sort,
                ...(category ? { category } : {}),
                ...(provider ? { author: provider } : {})
            })
            const res = await fetch(`${API_URL}/api/search?${params.toString()}`)
            return res.json()
        },
        placeholderData: (previousData) => previousData
    })

    // Transform data
    const skills: Skill[] = (searchData?.skills || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        owner: s.github_owner,
        repo: s.github_repo,
        skill_slug: s.skill_slug,
        tags: typeof s.tags === 'string' ? JSON.parse(s.tags || '[]') : (s.tags || []),
        source: s.github_url,
        author: { name: s.author, github: s.github_owner },
        version: s.version,
        downloads: s.install_count,
        verified: s.is_verified === 1,
        created_at: s.created_at,
    }))

    const marketplaceData: MarketplaceData = {
        skills: skills,
        categories: [],
    }

    const handleSearchChange = (q: string) => {
        setSearchQuery(q)
        setPage(0)
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans antialiased">
            <SEO
                title={`Skills Registry | ${BRANDING.brand_name}`}
                description="The Open Agent Skills Ecosystem. Enhance your agents with procedural knowledge."
                keywords={['agentic skills', 'ai registry', BRANDING.brand_lower_name]}
            />

            {/* Sleek Hero Section */}
            <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white uppercase">
                        skills
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl font-medium leading-relaxed">
                        Discover and install procedural knowledge for your AI agents with a single command.
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5 pt-10">
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                            One command install
                        </h3>
                        <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 flex items-center gap-3 group cursor-pointer hover:border-white/20 transition-all shadow-sm" onClick={() => {
                            navigator.clipboard.writeText(`npx ${BRANDING.brand_lower_name} add <owner/repo> --skill <name>`)
                        }}>
                            <code className="text-xs font-mono text-gray-400 flex-1 truncate">
                                <span className="text-white mr-1">$</span>
                                npx {BRANDING.brand_lower_name} add <span className="text-gray-500">{"<owner/repo>"}</span> --skill <span className="text-gray-500">{"<name>"}</span>
                            </code>
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                            Supported Agents
                        </h3>
                        <div className="flex items-center gap-5 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <div className="text-sm font-bold text-white">Cursor</div>
                            <div className="text-sm font-bold text-white">Claude</div>
                            <div className="text-sm font-bold text-white">Windsurf</div>
                            <div className="text-sm font-bold text-white">Vercel</div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 py-12 pb-32">
                <SkillsList
                    data={marketplaceData}
                    isLoading={isLoading}
                    totalCount={searchData?.pagination?.total || 0}
                    currentPage={page}
                    limit={limit}
                    onPageChange={setPage}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    sort={sort}
                    onSortChange={(s) => setSort(s as any)}
                />
            </main>
        </div>
    )
}
