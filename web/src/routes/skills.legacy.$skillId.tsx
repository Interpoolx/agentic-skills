import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BRANDING } from '../web.config'
import type { Skill } from '../types'
import confetti from 'canvas-confetti'
import clsx from 'clsx'
import { ShareModal } from '../components/ShareModal'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'

export const Route = createFileRoute('/skills/legacy/$skillId')({
  component: SkillPage,
})

function SkillPage() {
  const { skillId } = useParams({ from: '/skills/legacy/$skillId' })
  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)

  // Local State for interactions
  const [isLiked, setIsLiked] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    // Reset state on skillId change
    setLoading(true)
    setSkill(null)

    // Load Skill Data
    fetch(`${API_URL}/api/skills/${skillId}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) return null
          throw new Error('Failed to fetch skill')
        }
        return res.json()
      })
      .then((data: Skill | null) => {
        setSkill(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load skill:', err)
        setLoading(false)
      })

    // Load User State
    const likedSkills = JSON.parse(localStorage.getItem('likedSkills') || '[]')
    setIsLiked(likedSkills.includes(skillId))

    const installedSkills = JSON.parse(localStorage.getItem('installedSkills') || '[]')
    setIsInstalled(installedSkills.includes(skillId))
  }, [skillId])

  const toggleLike = () => {
    const likedSkills = JSON.parse(localStorage.getItem('likedSkills') || '[]')
    let newLikedSkills
    if (isLiked) {
      newLikedSkills = likedSkills.filter((id: string) => id !== skillId)
    } else {
      newLikedSkills = [...likedSkills, skillId]
    }
    localStorage.setItem('likedSkills', JSON.stringify(newLikedSkills))
    setIsLiked(!isLiked)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Skill not found</h2>
        <p className="mt-6 text-base leading-7 text-gray-600">The skill you are looking for does not exist.</p>
        <div className="mt-10">
          <Link to="/skills" className="text-sm font-semibold leading-7 text-indigo-600">
            <span aria-hidden="true">&larr;</span> Back to Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${skill.name} | ${BRANDING.brand_name}`}
        description={skill.description}
        keywords={typeof skill.tags === 'string' ? JSON.parse(skill.tags) : skill.tags}
        type="article"
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        skillName={skill.name}
        skillUrl={window.location.href}
      />

      <div className="fixed inset-0 -z-10 transform-gpu overflow-hidden blur-3xl opacity-30" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
        ></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to="/skills" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            &larr; Back to Directory
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-gray-200 overflow-hidden p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                      {skill.name}
                    </h1>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>v{skill.version || '1.0.0'}</span>
                    <span>•</span>
                    <span>{(skill.downloads || 0) + (isInstalled ? 1 : 0)} installs</span>
                    <span>•</span>
                    <span>Updated {skill.created_at ? new Date(skill.created_at).toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleLike}
                    className={clsx(
                      "p-2 rounded-full transition-colors",
                      isLiked ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400 hover:text-red-500"
                    )}
                  >
                    <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="mt-6 text-lg leading-8 text-gray-600">
                {skill.description}
              </p>

              <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {skill.author && (
                  (() => {
                    const authorName = typeof skill.author === 'string' ? skill.author : (skill.author as any).name || 'Unknown'
                    return (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Author</h3>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] uppercase">
                            {authorName.substring(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 truncate">{authorName}</span>
                        </div>
                      </div>
                    )
                  })()
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <div className="mt-2 text-sm font-semibold text-gray-900 capitalize">{skill.category}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-4">Installation</h2>
              <p className="text-gray-400 text-sm mb-6">Run this command in your terminal to add this skill to your agent.</p>
              <div
                className="relative group cursor-pointer"
                onClick={() => {
                  const command = `npx ${BRANDING.brand_lower_name} install ${skill.id}`
                  navigator.clipboard.writeText(command)
                  setShowCopied(true)
                  setTimeout(() => setShowCopied(false), 2000)
                  confetti({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.8 },
                    colors: ['#4f46e5', '#818cf8']
                  })
                }}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center justify-between rounded-lg bg-black px-4 py-4 ring-1 ring-white/10 hover:bg-white/5 transition-colors">
                  <code className="text-indigo-300 font-mono text-sm leading-6">npx ${BRANDING.brand_lower_name} install {skill.id}</code>
                  {showCopied ? (
                    <span className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-1 rounded">Copied!</span>
                  ) : (
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
