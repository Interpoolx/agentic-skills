import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ShareModal } from '../components/ShareModal'
import { SEO } from '../components/SEO'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { API_URL } from '../constants'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/prd/$slug')({
  component: PrdPage,
})

interface Prd {
  id: string
  slug: string
  name: string
  description: string
  category: string
  tags: string
  author: string
  version: string
  file_path: string
  content?: string // Added for database-stored content
  view_count: number
  download_count: number
  like_count: number
  created_at: string
  updated_at: string
}

function PrdPage() {
  const { slug } = useParams({ from: '/prd/$slug' })
  const [isLiked, setIsLiked] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)

  // Fetch PRD data
  const { data: prd, isLoading } = useQuery<Prd>({
    queryKey: ['prd', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/prd/${slug}`)
      if (!res.ok) throw new Error('PRD not found')
      return res.json()
    }
  })

  // Fetch related PRDs
  const { data: relatedData } = useQuery({
    queryKey: ['related-prds', prd?.category],
    queryFn: async () => {
      if (!prd?.category) return { prds: [] }
      const res = await fetch(`${API_URL}/api/prds?category=${prd.category}&limit=5`)
      return res.json()
    },
    enabled: !!prd?.category
  })

  const relatedPrds = (relatedData?.prds || []).filter((p: Prd) => p.slug !== slug).slice(0, 3)

  // Load PRD content
  useEffect(() => {
    if (prd?.content) {
      setContent(prd.content)
    } else if (prd?.file_path) {
      const contentUrl = prd.file_path.startsWith('http')
        ? prd.file_path
        : `${window.location.origin}${prd.file_path}`

      fetch(contentUrl)
        .then(res => res.text())
        .then(setContent)
        .catch(err => {
          console.error('Failed to load PRD content:', err)
          setContent('*Content could not be loaded.*')
        })
    }
  }, [prd?.file_path, prd?.content])

  // Track view
  useEffect(() => {
    if (slug) {
      fetch(`${API_URL}/api/prds/${slug}/view`, { method: 'POST' }).catch(() => { })
    }
  }, [slug])

  // Load like state
  useEffect(() => {
    const likedPrds = JSON.parse(localStorage.getItem('likedPrds') || '[]')
    setIsLiked(likedPrds.includes(slug))
  }, [slug])

  const toggleLike = () => {
    const likedPrds = JSON.parse(localStorage.getItem('likedPrds') || '[]')
    let newLikedPrds
    if (isLiked) {
      newLikedPrds = likedPrds.filter((id: string) => id !== slug)
    } else {
      newLikedPrds = [...likedPrds, slug]
      fetch(`${API_URL}/api/prds/${slug}/like`, { method: 'POST' }).catch(() => { })
    }
    localStorage.setItem('likedPrds', JSON.stringify(newLikedPrds))
    setIsLiked(!isLiked)
  }

  const handleDownload = async () => {
    if (!prd || !content) return
    await fetch(`${API_URL}/api/prds/${slug}/download`, { method: 'POST' }).catch(() => { })
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prd.slug}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!prd) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Spec not found</h2>
        <p className="mt-6 text-base leading-7 text-gray-600">The specification you are looking for does not exist.</p>
        <div className="mt-10">
          <Link to="/prds" className="text-sm font-semibold leading-7 text-indigo-600">
            <span aria-hidden="true">&larr;</span> Back to Directory
          </Link>
        </div>
      </div>
    )
  }

  const tags = typeof prd.tags === 'string' ? JSON.parse(prd.tags || '[]') : (prd.tags || [])
  const reportIssueUrl = `https://github.com/${BRANDING.github_org}/${BRANDING.github_repo}/issues/new?title=Issue+with+${encodeURIComponent(prd.name)}&body=I+found+an+issue+with+spec:+${prd.slug}`

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <SEO
        title={prd.name}
        description={prd.description}
        keywords={tags}
        type="article"
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        skillName={prd.name}
        skillUrl={window.location.href}
      />

      <div className="fixed inset-0 -z-10 transform-gpu overflow-hidden blur-3xl opacity-30" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#80caff] to-[#4f46e5] sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
        ></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/prds" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            Back to Directory
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Card */}
            <div className="bg-[#0a0a0a] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden p-8 sm:p-12">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    {prd.name}
                  </h1>
                  <div className="mt-4 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    <span>v{prd.version}</span>
                    <span className="opacity-20">•</span>
                    <span>{prd.view_count} views</span>
                    <span className="opacity-20">•</span>
                    <span>Updated {prd.updated_at ? new Date(prd.updated_at).toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={toggleLike}
                    className={clsx(
                      "p-3 rounded-2xl transition-all border",
                      isLiked ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/10"
                    )}
                  >
                    <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {prd.view_count} views
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {prd.download_count} downloads
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  {prd.category}
                </div>
              </div>

              <p className="mt-10 text-xl leading-relaxed text-gray-400 font-medium">
                {prd.description}
              </p>

              <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-8">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Author</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xs uppercase shadow-2xl">
                      {prd.author?.substring(0, 2)}
                    </div>
                    <span className="text-sm font-bold text-white truncate">{prd.author}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Category</h3>
                  <div>
                    <span className="text-sm font-bold text-white uppercase tracking-tight">{prd.category}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Version</h3>
                  <div>
                    <span className="text-sm font-bold text-white">{prd.version}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Updated</h3>
                  <div>
                    <span className="text-sm font-bold text-white">
                      {prd.updated_at ? new Date(prd.updated_at).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Card */}
            <div className="bg-[#0a0a0a] rounded-[2rem] shadow-2xl border border-white/5 p-8 sm:p-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] -z-10 rounded-full"></div>

              <div className="flex items-center gap-3 mb-12">
                <div className="h-px w-8 bg-indigo-500/50"></div>
                <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">Specification Content</h2>
              </div>

              {content ? (
                <div className="prose prose-invert max-w-none">
                  <MarkdownRenderer content={content} className="prose-content" />
                </div>
              ) : (
                <div className="animate-pulse space-y-6">
                  <div className="h-4 bg-white/5 rounded-full w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded-full w-full"></div>
                  <div className="h-4 bg-white/5 rounded-full w-5/6"></div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Download Card */}
            <div className="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-6 bg-indigo-500/50"></div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Download</h3>
              </div>
              <button
                onClick={handleDownload}
                className="w-full bg-white/5 border border-white/10 text-white py-4 px-6 rounded-2xl font-bold text-[13px] tracking-tight hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Markdown
              </button>
            </div>

            {/* Resources Card */}
            <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl">
              <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-6">Resources</h3>
              <ul className="space-y-4">
                <li>
                  <a href={reportIssueUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm font-bold text-gray-500 hover:text-red-500 transition-all uppercase tracking-tight">
                    <svg className="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Report an Issue
                  </a>
                </li>
              </ul>
            </div>

            {/* Tags Card */}
            {tags.length > 0 && (
              <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl">
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-6">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Specs */}
            {relatedPrds.length > 0 && (
              <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 shadow-2xl">
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-8">Related Specs</h3>
                <div className="space-y-8">
                  {relatedPrds.map((related: Prd) => (
                    <Link
                      key={related.id}
                      to="/prd/$slug"
                      params={{ slug: related.slug }}
                      className="group block"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center text-xs font-bold transition-all group-hover:scale-110 shadow-2xl">
                          {related.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-gray-400 transition-colors truncate">
                            {related.name}
                          </p>
                          <p className="text-[11px] font-medium text-gray-600 truncate mt-1">
                            {related.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
