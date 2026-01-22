import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Skill } from '../types'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/skills/$owner/$repo/')({
  component: RepoPage,
})

function RepoPage() {
  const { owner, repo } = useParams({ from: '/skills/$owner/$repo/' })
  const [skillsInRepo, setSkillsInRepo] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/api/skills/${owner}/${repo}`)
      .then(res => res.json())
      .then(data => {
        setSkillsInRepo(data.skills || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load repo skills:', err)
        setLoading(false)
      })
  }, [owner, repo])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  // Calculate totals
  const totalInstalls = skillsInRepo.reduce((sum, s: any) => sum + (s.install_count || s.downloads || 0), 0)
  const formatInstalls = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white/20">
      <SEO
        title={`Open Agent Skills by ${owner}/${repo}`}
        description={`Explore skills from ${owner}/${repo} on the ${BRANDING.brand_name} Registry.`}
      />

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
          <Link to="/skills" className="hover:text-white transition-colors">skills</Link>
          <span className="opacity-20">/</span>
          <Link to="/skills/$owner" params={{ owner }} className="hover:text-white transition-colors lowercase">{owner}</Link>
          <span className="opacity-20">/</span>
          <span className="text-gray-400 lowercase">{repo}</span>
        </nav>

        {/* Header Section */}
        <header className="space-y-8 mb-12">
          <h1 className="text-5xl font-bold tracking-tight text-white lowercase">
            {owner}/{repo}
          </h1>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[13px] font-medium text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <span>{skillsInRepo.length} {skillsInRepo.length === 1 ? 'skill' : 'skills'}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span>{formatInstalls(totalInstalls)} total installs</span>
            </div>
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors group"
            >
              <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              <span>GitHub</span>
            </a>
          </div>
        </header>

        {/* Skills List */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500/50 pb-2 border-b border-white/5">
            <span>SKILL</span>
            <span>INSTALLS</span>
          </div>

          <div className="divide-y divide-white/5">
            {skillsInRepo.map((skill: any) => (
              <div key={skill.id} className="py-4 group hover:bg-white/[0.02] -mx-4 px-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 min-w-0 pr-12">
                    <Link
                      to="/skills/$owner/$repo/$skillSlug"
                      params={{ owner, repo, skillSlug: skill.skill_slug || skill.id }}
                      className="text-[16px] font-bold text-white hover:text-gray-300 transition-colors inline-block lowercase"
                    >
                      {skill.skill_slug || skill.id}
                    </Link>
                    <p className="text-[15px] text-gray-500 font-medium leading-relaxed line-clamp-1 max-w-3xl">
                      {skill.description}
                    </p>
                  </div>
                  <div className="text-[15px] font-bold text-white tabular-nums shrink-0">
                    {formatInstalls(skill.install_count || skill.downloads || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {skillsInRepo.length === 0 && (
            <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-gray-600 font-medium">No skills found in this repository.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
