import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { API_URL } from '../constants'
import { SEO } from '../components/SEO'

export const Route = createFileRoute('/prompt/$slug')({
  component: PromptDetailPage,
})

interface Prompt {
  id: string
  slug: string
  title: string
  description: string
  promptText: string
  systemPrompt: string
  category: string
  tags: string
  promptType: string
  complexity: string
  modelCompatibility: string
  recommendedModel: string
  author: string
  viewCount: number
  copyCount: number
  useCount: number
  favoriteCount: number
  averageRating: number
  successRate: number
  isFeatured: number
  hasVariables: number
  version: string
  createdAt: string
  updatedAt: string
}

interface PromptVariable {
  id: string
  name: string
  description: string
  placeholder: string
  defaultValue: string
  isRequired: number
  variableType: string
}

interface Review {
  id: string
  userId: string
  rating: number
  title: string
  reviewText: string
  clarityRating: number
  effectivenessRating: number
  helpfulCount: number
  createdAt: string
}

// Helper to extract {{variables}} from prompt text
function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim())
  }
  return [...new Set(matches)]
}

function PromptDetailPage() {
  const { slug } = useParams({ from: '/prompt/$slug' })
  const [copied, setCopied] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'playground' | 'template'>('playground')

  // Fetch prompt details
  const { data: prompt, isLoading } = useQuery<Prompt>({
    queryKey: ['prompt', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/prompts/${slug}`)
      if (!res.ok) throw new Error('Prompt not found')
      return res.json()
    }
  })

  // Fetch variables from API
  const { data: variablesData } = useQuery({
    queryKey: ['prompt-variables', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/prompts/${slug}/variables`)
      return res.json()
    },
    enabled: !!prompt?.hasVariables
  })

  // Fetch reviews
  const { data: reviewsData } = useQuery({
    queryKey: ['prompt-reviews', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/prompts/${slug}/reviews`)
      return res.json()
    }
  })

  const apiVariables: PromptVariable[] = variablesData?.variables || []

  // Extract variables from prompt text as fallback
  const detectedVariables = useMemo(() => {
    if (!prompt?.promptText) return []
    return extractVariables(prompt.promptText)
  }, [prompt?.promptText])

  // Use API variables if available, otherwise use detected ones
  const variables = apiVariables.length > 0
    ? apiVariables.map(v => v.name)
    : detectedVariables

  const reviews: Review[] = reviewsData?.reviews || []

  // Generate the preview with substituted variables
  const generatedPrompt = useMemo(() => {
    if (!prompt?.promptText) return ''
    let result = prompt.promptText
    variables.forEach(varName => {
      const value = variableValues[varName] || `{{${varName}}}`
      result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value)
    })
    return result
  }, [prompt?.promptText, variables, variableValues])

  // Check if all variables are filled
  const allVariablesFilled = useMemo(() => {
    return variables.every(v => variableValues[v]?.trim())
  }, [variables, variableValues])

  // Track view on mount
  useEffect(() => {
    if (prompt) {
      fetch(`${API_URL}/api/prompts/${slug}/view`, { method: 'POST' })
    }
  }, [prompt, slug])

  // Copy mutation
  const copyMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API_URL}/api/prompts/${slug}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: 'original' })
      })
    }
  })

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    copyMutation.mutate()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFavorite = async () => {
    if (!prompt) return
    try {
      await fetch(`${API_URL}/api/prompts/${slug}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      setIsFavorited(!isFavorited)
    } catch (e) {
      console.error('Failed to favorite', e)
    }
  }

  const getComplexityBadge = (complexity: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
      intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      advanced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      expert: 'bg-red-500/10 text-red-400 border-red-500/20'
    }
    return colors[complexity] || 'bg-white/5 text-gray-400 border-white/10'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading prompt...</div>
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Prompt not found</h1>
        <Link to="/prompts" className="text-purple-400 hover:text-purple-300">
          ← Back to library
        </Link>
      </div>
    )
  }

  const hasVariablesToFill = variables.length > 0

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      <SEO
        title={`${prompt.title} - AI Prompt`}
        description={prompt.description}
        keywords={prompt.tags?.split(',').map(t => t.trim()) || []}
      />

      <div className="mx-auto max-w-6xl px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link to="/prompts" className="text-gray-400 hover:text-white transition-colors">
            ← Back to Prompts Library
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-sm font-medium text-purple-400">
              {prompt.promptType}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${getComplexityBadge(prompt.complexity)}`}>
              {prompt.complexity}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-sm font-medium text-gray-400">
              {prompt.category}
            </span>
            {prompt.isFeatured === 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-medium text-yellow-400">
                ⭐ Featured
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {prompt.title}
          </h1>
          <p className="text-lg text-gray-400 mb-6">
            {prompt.description}
          </p>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <span>By <span className="text-white font-medium">{prompt.author}</span></span>
            <span className="flex items-center gap-1">📋 {prompt.copyCount} copies</span>
            <span className="flex items-center gap-1">👁️ {prompt.viewCount} views</span>
            <span className="flex items-center gap-1">❤️ {prompt.favoriteCount} saves</span>
            {prompt.recommendedModel && (
              <span>Best for <span className="text-purple-400 font-medium">{prompt.recommendedModel}</span></span>
            )}
          </div>
        </header>

        {/* Main Content with Tabs */}
        <div className="space-y-8">
          {/* Tabs Header */}
          {hasVariablesToFill && (
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('playground')}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'playground'
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span>🎮</span>
                  <span>Playground</span>
                </div>
                {activeTab === 'playground' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('template')}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'template'
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span>📝</span>
                  <span>Original Template</span>
                </div>
                {activeTab === 'template' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                )}
              </button>
            </div>
          )}

          {/* Playground Tab */}
          {hasVariablesToFill && activeTab === 'playground' && (
            <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl border border-purple-500/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-purple-500/20">
                <h2 className="font-bold text-white text-lg">Prompt Playground</h2>
                <p className="text-sm text-gray-400">Fill in the placeholders to generate your custom prompt</p>
              </div>

              <div className="p-6">
                {/* Variable Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {variables.map((varName) => {
                    const apiVar = apiVariables.find(v => v.name === varName)
                    const isLongInput = ['points', 'text', 'code', 'notes', 'data', 'content', 'description'].some(k => varName.toLowerCase().includes(k))
                    return (
                      <div key={varName} className={`space-y-2 ${isLongInput ? 'md:col-span-2' : ''}`}>
                        <label className="block text-sm font-medium text-gray-300">
                          {varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {apiVar?.isRequired === 1 && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {apiVar?.description && (
                          <p className="text-xs text-gray-500">{apiVar.description}</p>
                        )}
                        {isLongInput ? (
                          <textarea
                            placeholder={apiVar?.placeholder || `Enter ${varName.replace(/_/g, ' ')}...`}
                            value={variableValues[varName] || ''}
                            onChange={(e) => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none"
                            rows={3}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder={apiVar?.placeholder || `Enter ${varName.replace(/_/g, ' ')}...`}
                            value={variableValues[varName] || ''}
                            onChange={(e) => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Generated Preview */}
                <div className="bg-black/50 rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✨</span>
                      <span className="text-sm font-medium text-gray-300">Generated Prompt</span>
                      {allVariablesFilled && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Ready!</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(generatedPrompt)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${copied
                          ? 'bg-green-500/20 text-green-400'
                          : allVariablesFilled
                            ? 'bg-purple-500 text-white hover:bg-purple-600'
                            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        }`}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <div className="p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-auto">
                    {generatedPrompt}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template Tab (or default if no variables) */}
          {(!hasVariablesToFill || activeTab === 'template') && (
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h2 className="font-semibold text-white">
                  {hasVariablesToFill ? 'Original Template' : 'Prompt'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFavorite}
                    className={`p-2 rounded-lg transition-colors ${isFavorited
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    title={isFavorited ? 'Saved!' : 'Save to favorites'}
                  >
                    <svg className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCopy(prompt.promptText)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${copied
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                      }`}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Template'}
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap">
                  {prompt.promptText}
                </div>
              </div>
            </div>
          )}

          {/* Tags & Model Compatibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prompt.tags && (
              <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-6">
                <h3 className="font-semibold text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.split(',').map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-400 border border-white/10"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {prompt.modelCompatibility && (
              <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-6">
                <h3 className="font-semibold text-white mb-4">Compatible Models</h3>
                <div className="flex flex-wrap gap-2">
                  {prompt.modelCompatibility.split(',').map((model, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400"
                    >
                      {model.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-6">
              <h2 className="font-semibold text-white mb-6">Reviews ({reviews.length})</h2>
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-white">{review.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{review.reviewText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
