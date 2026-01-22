import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'

export const Route = createFileRoute('/prompts')({
  component: PromptsPage,
})

interface Prompt {
  id: string
  slug: string
  title: string
  description: string
  category: string
  tags: string
  promptType: string
  complexity: string
  author: string
  viewCount: number
  copyCount: number
  favoriteCount: number
  isFeatured: number
  createdAt: string
}

function PromptsPage() {
  const [page, setPage] = useState(0)
  const [limit] = useState(20)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<'copies' | 'views' | 'likes' | 'recent'>('copies')

  // Fetch Prompts
  const { data, isLoading } = useQuery({
    queryKey: ['prompts', page, limit, searchQuery, category, sort],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: (page + 1).toString(),
        sort: sort,
        ...(searchQuery ? { q: searchQuery } : {}),
        ...(category ? { category } : {})
      })
      const res = await fetch(`${API_URL}/api/prompts?${params.toString()}`)
      return res.json()
    },
    placeholderData: (previousData) => previousData
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['prompt-categories'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/prompts/categories`)
      return res.json()
    }
  })

  const prompts: Prompt[] = data?.prompts || []
  const categories = categoriesData || []
  const totalCount = data?.pagination?.total || 0

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    setPage(0)
  }

  const handleCategoryChange = (c: string | null) => {
    setCategory(c)
    setPage(0)
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      <SEO
        title="AI Prompts Library"
        description="Browse curated AI prompts for ChatGPT, Claude, and other LLMs. Copy and use proven prompts."
        keywords={['ai prompts', 'chatgpt prompts', 'claude prompts', 'prompt library']}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="border-b border-white/5 pb-5 mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Prompts Library
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Browse curated AI prompts for ChatGPT, Claude, and other LLMs.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-zinc-900 border-white/5 rounded-lg shadow-sm focus:border-white/20 focus:ring-0 text-white text-sm px-4 py-2.5"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category || ''}
            onChange={(e) => handleCategoryChange(e.target.value || null)}
            className="bg-zinc-900 border-white/5 rounded-lg shadow-sm focus:border-white/20 focus:ring-0 text-white text-sm px-4 py-2.5"
          >
            <option value="">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.slug || cat.id} className="bg-zinc-900">
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-zinc-900 border-white/5 rounded-lg shadow-sm focus:border-white/20 focus:ring-0 text-white text-sm px-4 py-2.5"
          >
            <option value="copies">Most Copied</option>
            <option value="views">Most Viewed</option>
            <option value="likes">Most Saved</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          {totalCount} {totalCount === 1 ? 'prompt' : 'prompts'} found
        </p>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-900/50 rounded-xl p-6 shadow-sm border border-white/5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-white/5 rounded w-full mb-2"></div>
                <div className="h-3 bg-white/5 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No prompts found. Try adjusting your filters.</p>
          </div>
        ) : (
          /* Prompts Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <Link
                key={prompt.id}
                to="/prompt/$slug"
                params={{ slug: prompt.slug }}
                className="group bg-zinc-900/50 rounded-xl p-6 shadow-sm border border-white/5 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-1 text-xs font-medium text-gray-400 border border-white/5 capitalize">
                    {prompt.category}
                  </span>
                  <div className="flex items-center gap-2">
                    {prompt.isFeatured === 1 && (
                      <span className="text-yellow-400" title="Featured">⭐</span>
                    )}
                    <span className="text-xs text-gray-500 capitalize">{prompt.complexity}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-gray-300 transition-colors mb-2">
                  {prompt.title}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                  {prompt.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium">{prompt.author}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Copies">
                      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {prompt.copyCount || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Views">
                      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {prompt.viewCount || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Saves">
                      <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {prompt.favoriteCount || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > limit && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-medium text-gray-400 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              Page {page + 1} of {Math.ceil(totalCount / limit)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= totalCount}
              className="px-4 py-2 text-sm font-medium text-gray-400 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
