import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Skill } from '../types'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'
import { BRANDING } from '../web.config'
import confetti from 'canvas-confetti'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clsx } from 'clsx'

export const Route = createFileRoute('/skills/$owner/$repo/$skillSlug')({
  component: HierarchicalSkillPage,
})

function HierarchicalSkillPage() {
  const { owner, repo, skillSlug } = useParams({ from: '/skills/$owner/$repo/$skillSlug' })
  const [skill, setSkill] = useState<(Skill & { content?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCopied, setShowCopied] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_URL}/api/skills/${owner}/${repo}/${skillSlug}`)
      .then(res => res.json())
      .then(data => {
        setSkill(data)
        setLoading(false)
        // Track view
        if (data.id) {
          fetch(`${API_URL}/api/skills/${data.id}/view`, { method: 'POST' })
        }
      })
      .catch(err => {
        console.error('Failed to load skill:', err)
        setLoading(false)
      })
  }, [owner, repo, skillSlug])

  const handleLike = async () => {
    if (!skill || isLiked) return
    try {
      const res = await fetch(`${API_URL}/api/skills/${skill.id}/like`, { method: 'POST' })
      if (res.ok) {
        setIsLiked(true)
        setSkill(prev => prev ? { ...prev, totalLikes: ((prev as any).totalLikes || 0) + 1 } : null)
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ff0000', '#ff5555']
        })
      }
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#4f46e5', '#818cf8']
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4 uppercase italic">Skill not found</h1>
        <p className="text-gray-500 mb-8 font-medium">We couldn't find the skill you're looking for.</p>
        <Link to="/skills" className="text-sm font-bold text-white hover:text-gray-300 transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl">
          &larr; Back to registry
        </Link>
      </div>
    )
  }

  const githubUrl = `https://github.com/${owner}/${repo}`
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const formatLargeNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20 relative">
      <SEO
        title={`${skill.name} | ${BRANDING.brand_name}`}
        description={skill.description}
      />

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[40px] w-full max-w-sm overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white mb-6 border border-white/5">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Share this skill</h2>
              <p className="text-gray-500 text-[13px] mb-8 leading-relaxed max-w-[240px]">Spread the word and help others discover {skill.name}.</p>

              <div className="grid grid-cols-1 gap-2 w-full mb-6">
                <a
                  href={`https://twitter.com/intent/tweet?text=Check out this skill: ${skill.name}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/5 text-gray-300 font-bold rounded-2xl hover:bg-white/10 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 fill-current text-[#1D9BF0]" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    <span>Twitter / X</span>
                  </div>
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </a>
              </div>

              <div className="w-full relative">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 pr-24 text-gray-400 text-[13px] font-medium focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(shareUrl)}
                  className="absolute right-2 top-2 bottom-2 px-5 bg-white text-black font-bold text-[12px] rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {showCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20 animate-in fade-in duration-500">
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-8 font-medium">
          <Link to="/skills" className="hover:text-white transition-colors">skills</Link>
          <span className="opacity-20">/</span>
          <Link to="/skills/$owner" params={{ owner }} className="hover:text-white transition-colors lowercase">{owner}</Link>
          <span className="opacity-20">/</span>
          <Link to="/skills/$owner/$repo" params={{ owner, repo }} className="hover:text-white transition-colors lowercase truncate">{repo}</Link>
          <span className="opacity-20">/</span>
          <span className="text-gray-400 truncate lowercase">{skillSlug}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-5xl font-bold tracking-tight text-white lowercase mb-6">
            {skillSlug}
          </h1>

          <div className="flex flex-wrap items-center gap-6">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all text-[13px] font-medium text-gray-400 hover:text-white outline-none active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              <span>Share</span>
            </button>

            <button
              onClick={handleLike}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[13px] font-medium outline-none active:scale-95",
                isLiked
                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                  : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10 text-gray-400 hover:text-white"
              )}
            >
              <svg className={clsx("w-4 h-4", isLiked && "fill-current")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span>{(skill as any).totalLikes || 0}</span>
            </button>

            <div className="flex items-center gap-2 text-[13px] font-medium text-gray-500">
              <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span>{formatLargeNumber((skill as any).totalViews || 0)} views</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <div className="prose prose-invert max-w-none mb-16">
              <h1 className="text-4xl !mb-8">{skill.name}</h1>
              <p className="text-lg mb-8">{skill.description}</p>

              {skill.content ? (
                <div className="animate-in slide-in-from-bottom-4 duration-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {skill.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="py-20 text-center bg-zinc-950/50 rounded-3xl border border-white/5 border-dashed">
                  <p className="text-gray-600 text-[13px] font-bold uppercase tracking-widest italic">No content found for this skill.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-12">
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500/50">INSTALL</h3>
              <div
                className="group relative bg-[#111] border border-white/5 rounded-xl p-4 pr-12 flex items-center gap-3 hover:border-white/10 transition-all cursor-pointer overflow-hidden active:scale-[0.98]"
                onClick={() => copyToClipboard(`npx ${BRANDING.brand_lower_name} add ${owner}/${repo} --skill ${skillSlug}`)}
              >
                <span className="text-gray-500 font-mono text-[14px]">$</span>
                <code className="text-[14px] font-mono text-gray-300 flex-1 truncate">
                  npx {BRANDING.brand_lower_name} add {owner}/{repo} --skill {skillSlug}
                </code>
                <div className="absolute right-3 p-1.5 rounded-lg bg-white/5 text-gray-500 group-hover:text-white transition-all">
                  {showCopied ? (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-10 border-t border-white/5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500/50">REPOSITORY</h3>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] font-bold text-gray-300 hover:text-white transition-colors block lowercase"
              >
                {owner}/{repo}
              </a>
            </div>

            <div className="space-y-4 pt-10 border-t border-white/5">
              <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-tight">
                <span className="text-gray-600">Category</span>
                <span className="text-white lowercase">{skill.category}</span>
              </div>
              <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-tight">
                <span className="text-gray-600">Stars</span>
                <span className="text-white tabular-nums">{skill.stars || 0}</span>
              </div>
              <div className="flex justify-between items-center text-[12px] font-bold uppercase tracking-tight">
                <span className="text-gray-600">Version</span>
                <span className="text-white font-mono">v{skill.version || '1.0.0'}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
