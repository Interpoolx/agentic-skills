import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/skills/$owner/')({
  component: OwnerPage,
})

interface OwnerData {
  name: string
  slug: string
  description?: string
  githubUrl?: string
  stats: {
    repoCount: number
    skillCount: number
    totalInstalls: number
  }
  repos: Array<{
    id: string
    name: string
    slug: string
    description?: string
    total_installs: number
    skills: Array<{
      name: string
      slug: string
    }>
  }>
}

function OwnerPage() {
  const { owner: ownerSlug } = useParams({ from: '/skills/$owner/' })
  const [data, setData] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/api/owners/${ownerSlug}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error('Failed to fetch owner details:', err))
      .finally(() => setLoading(false))
  }, [ownerSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!data || (data as any).error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4 uppercase italic">Owner not found</h1>
        <p className="text-gray-500 mb-8 font-medium">We couldn't find the developer you're looking for.</p>
        <Link to="/skills" className="text-sm font-bold text-white hover:text-gray-300 transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl">
          &larr; Back to registry
        </Link>
      </div>
    )
  }

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <SEO
        title={`Open Agent Skills by ${data.name || ownerSlug}`}
        description={`Explore agent skills by ${data.name || ownerSlug} on ${BRANDING.brand_name}.`}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
          <Link to="/skills" className="hover:text-white transition-colors">skills</Link>
          <span className="opacity-20">/</span>
          <span className="text-gray-400 lowercase">{ownerSlug}</span>
        </nav>

        {/* Owner Header */}
        <header className="space-y-8 mb-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-white lowercase">
              {ownerSlug}
            </h1>
            {data.description && (
              <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
                {data.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[13px] font-medium text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <span>{data.stats.repoCount} repos</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <span>{data.stats.skillCount} skills</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span>{formatNumber(data.stats.totalInstalls)} total installs</span>
            </div>
            {data.githubUrl && (
              <a
                href={data.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors group"
              >
                <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                <span>GitHub</span>
              </a>
            )}
          </div>
        </header>

        {/* Repositories Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500/50 pb-2 border-b border-white/5">
            <span>REPOSITORY</span>
            <span>INSTALLS</span>
          </div>

          <div className="divide-y divide-white/5">
            {data.repos.map((repo) => (
              <div key={repo.id} className="py-4 group hover:bg-white/[0.02] -mx-4 px-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-4 min-w-0">
                    <Link
                      to="/skills/$owner/$repo"
                      params={{ owner: ownerSlug, repo: repo.slug }}
                      className="text-[16px] font-bold text-white hover:text-gray-300 transition-colors shrink-0 lowercase"
                    >
                      {repo.slug}
                    </Link>
                    <div className="flex items-center gap-2 text-[14px] text-gray-500 truncate">
                      <span className="shrink-0">{repo.skills.length} {repo.skills.length === 1 ? 'skill' : 'skills'}:</span>
                      <div className="truncate">
                        {repo.skills.map((skill, i) => (
                          <span key={skill.slug} className="inline-flex items-center gap-1">
                            <Link
                              to="/skills/$owner/$repo/$skillSlug"
                              params={{ owner: ownerSlug, repo: repo.slug, skillSlug: skill.slug }}
                              className="hover:text-white transition-colors"
                            >
                              {skill.name || skill.slug}
                            </Link>
                            {i < repo.skills.length - 1 && <span className="opacity-30 mr-1.5">,</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[15px] font-bold text-white tabular-nums shrink-0 ml-8">
                    {formatNumber(repo.total_installs)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.repos.length === 0 && (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-gray-600 font-medium">No repositories found for this owner.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
