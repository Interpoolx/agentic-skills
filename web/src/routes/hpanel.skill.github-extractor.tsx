import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Copy, Download, Github, CheckCircle, AlertCircle, Loader2, Send, Sparkles } from 'lucide-react'
import { getApiUrl, getAdminToken } from '../lib/api-config'

export const Route = createFileRoute('/hpanel/skill/github-extractor')({
  component: RouteComponent,
})



interface SkillData {
  id: string
  slug: string
  name: string
  owner: string
  repo: string
  repo_id: string
  short_description: string
  category: string
  tags: string[]
  github_url: string
  skill_file: string
  author: string
  version: string
  total_installs: number
  total_stars: number
  average_rating: number
  total_reviews: number
  is_verified: number
  is_featured: number
  status: string
  compatibility: string
  created_at: string
  updated_at: string
  source_url?: string
  daily_installs: number
  weekly_installs: number
}

function RouteComponent() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [skillData, setSkillData] = useState<SkillData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const parseGitHubInput = (input: string): string | null => {
    // Handle npx skills add format
    if (input.startsWith('npx skills add ')) {
      const path = input.replace('npx skills add ', '').trim()
      return `https://github.com/${path}`
    }

    // Handle direct URL
    if (input.startsWith('http')) {
      return input
    }

    // Handle owner/repo format
    if (input.includes('/')) {
      return `https://github.com/${input}`
    }

    return null
  }

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return null

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '')
    }
  }

  const fetchGitHubData = async () => {
    setLoading(true)
    setError('')
    setSkillData(null)
    setSubmitSuccess(false)

    try {
      const githubUrl = parseGitHubInput(input)
      if (!githubUrl) {
        throw new Error('Invalid input format')
      }

      const repoInfo = extractRepoInfo(githubUrl)
      if (!repoInfo) {
        throw new Error('Could not extract repository information')
      }

      const { owner, repo } = repoInfo

      // Fetch repository data
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
      if (!repoResponse.ok) {
        throw new Error('Repository not found')
      }
      const repoData = await repoResponse.json()

      // Try to find SKILL.md file
      // Try to find SKILL.md file
      let skillPath = null
      let skillContent = ''

      // First, try to find skills folder and explore it
      try {
        const skillsFolderResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/skills`
        )

        if (skillsFolderResponse.ok) {
          const skillsFolder = await skillsFolderResponse.json()

          // Skills folder exists, look for subdirectories
          if (Array.isArray(skillsFolder)) {
            for (const item of skillsFolder) {
              if (item.type === 'dir') {
                // Check for SKILL.md in this subdirectory
                try {
                  const subfolderResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/contents/skills/${item.name}`
                  )
                  if (subfolderResponse.ok) {
                    const subfolderContents = await subfolderResponse.json()
                    const skillFile = subfolderContents.find(
                      (file: any) => file.name.toLowerCase() === 'skill.md'
                    )

                    if (skillFile) {
                      const contentResponse = await fetch(skillFile.download_url)
                      if (contentResponse.ok) {
                        skillPath = `skills/${item.name}/SKILL.md`
                        skillContent = await contentResponse.text()
                        break
                      }
                    }
                  }
                } catch (e) {
                  continue
                }
              }
            }
          }
        }
      } catch (e) {
        // Skills folder doesn't exist, try other locations
      }

      // If not found in skills folder, check common locations
      if (!skillPath) {
        const possiblePaths = [
          'SKILL.md',
          'skill.md',
          'README.md'
        ]

        for (const path of possiblePaths) {
          try {
            const contentResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
            )
            if (contentResponse.ok) {
              const contentData = await contentResponse.json()
              skillPath = path
              skillContent = atob(contentData.content)
              break
            }
          } catch (e) {
            continue
          }
        }
      }

      // Extract metadata from SKILL.md content
      const extractMetadata = (content: string) => {
        const metadata = {
          name: '',
          description: '',
          category: 'general',
          tags: [] as string[],
          version: '1.0.0',
          author: owner
        }

        // 1. Try to extract from YAML frontmatter first
        const yamlNameMatch = content.match(/^name:\s*(.+)$/m);
        if (yamlNameMatch) {
          metadata.name = yamlNameMatch[1].trim().replace(/['"]/g, '');
        }

        const yamlDescMatch = content.match(/^description:\s*(.+)$/m);
        if (yamlDescMatch) {
          // handle multiline description in yaml if needed, for now simple single line or start
          metadata.description = yamlDescMatch[1].trim();
        }

        // 2. Fallback to H1 if no YAML name
        if (!metadata.name) {
          const titleMatch = content.match(/^#\s+(.+)$/m)
          if (titleMatch) {
            metadata.name = titleMatch[1].trim()
          }
        }

        // 3. Fallback to description if no YAML description
        if (!metadata.description) {
          const descMatch = content.match(/^#.+\n\n(.+?)(\n\n|$)/s)
          if (descMatch) {
            metadata.description = descMatch[1].trim().replace(/\n/g, ' ')
          }
        }

        // Extract tags from content
        const tagPatterns = [
          /tags?:\s*\[([^\]]+)\]/i,
          /keywords?:\s*\[([^\]]+)\]/i,
          /categories?:\s*\[([^\]]+)\]/i
        ]

        for (const pattern of tagPatterns) {
          const match = content.match(pattern)
          if (match) {
            metadata.tags = match[1]
              .split(',')
              .map(t => t.trim().replace(/['"]/g, ''))
              .filter(Boolean)
            break
          }
        }

        return metadata
      }

      const metadata = skillContent ? extractMetadata(skillContent) : {
        name: repoData.name,
        description: repoData.description || '',
        category: 'general',
        tags: repoData.topics || [],
        version: '1.0.0',
        author: owner
      }

      // Generate skill data
      const skill: SkillData = {
        id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        slug: repoData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: metadata.name || repoData.name,
        owner: owner,
        repo: repo,
        repo_id: `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        short_description: metadata.description || repoData.description || '',
        category: metadata.category,
        tags: metadata.tags.length > 0 ? metadata.tags : (repoData.topics || []),
        github_url: githubUrl,
        skill_file: skillPath
          ? `https://raw.githubusercontent.com/${owner}/${repo}/main/${skillPath}`
          : `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`,
        author: metadata.author,
        version: metadata.version,
        total_installs: 0,
        daily_installs: 0,
        weekly_installs: 0,
        source_url: githubUrl,
        total_stars: repoData.stargazers_count || 0,
        average_rating: 0,
        total_reviews: 0,
        is_verified: 0,
        is_featured: 0,
        status: 'published',
        compatibility: JSON.stringify({
          agents: ['claude-code', 'cursor', 'windsurf', 'aider'],
          requirements: ['nodejs>=16']
        }),
        created_at: repoData.created_at,
        updated_at: repoData.updated_at || repoData.pushed_at
      }

      setSkillData(skill)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch GitHub data')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (skillData) {
      navigator.clipboard.writeText(JSON.stringify(skillData, null, 2))
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 2000)
    }
  }

  const submitSkill = async () => {
    if (!skillData) return

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`${getApiUrl()}/api/admin/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({
          // repoId: skillData.repo_id, // Removed to let backend resolve/create repo from githubUrl
          name: skillData.name,
          slug: skillData.slug,
          description: skillData.short_description,
          category: skillData.category,
          tags: skillData.tags,
          version: skillData.version,
          status: skillData.status,
          githubUrl: skillData.github_url,
          author: skillData.author,
          skillFile: skillData.skill_file,
          totalStars: skillData.total_stars,
          isVerified: skillData.is_verified,
          isFeatured: skillData.is_featured,
          compatibility: skillData.compatibility,
          githubOwner: skillData.owner,
          githubRepo: skillData.repo,
          sourceUrl: skillData.source_url,
          dailyInstalls: skillData.daily_installs,
          weeklyInstalls: skillData.weekly_installs
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit skill')
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        setInput('')
        setSkillData(null)
        setSubmitSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit skill')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
              <Github className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                GitHub Skill Extractor
              </h1>
              <p className="text-gray-400 mt-1">
                Extract and validate skill data from GitHub repositories
              </p>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-zinc-900/50 backdrop-blur border border-white/10 rounded-2xl p-8 mb-8 shadow-2xl">
          <label className="block text-sm font-medium mb-3 text-gray-300">
            GitHub Repository Input
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchGitHubData()}
              placeholder="npx skills add owner/repo or https://github.com/owner/repo"
              className="flex-1 px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            <button
              onClick={fetchGitHubData}
              disabled={loading || !input}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Extract
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Supports: GitHub URL, owner/repo format, or npx skills add command
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 backdrop-blur border border-red-500/30 rounded-xl p-5 mb-8 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-400 mb-1">Error</div>
              <div className="text-sm text-red-300">{error}</div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && !skillData && (
          <div className="bg-green-900/20 backdrop-blur border border-green-500/30 rounded-xl p-5 mb-8 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-400 mb-1">Success!</div>
              <div className="text-sm text-green-300">Skill submitted successfully to database</div>
            </div>
          </div>
        )}

        {/* Extracted Data */}
        {skillData && (
          <div className="bg-zinc-900/50 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                </div>
                Extracted Skill Data
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                >
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </button>
                <button
                  onClick={submitSkill}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-50 transition-all shadow-lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit to Database
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Name</div>
                <div className="font-semibold text-lg">{skillData.name}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Slug</div>
                <div className="font-mono text-sm bg-black/50 px-3 py-1.5 rounded-lg inline-block">
                  {skillData.slug}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Owner</div>
                <div className="font-semibold">{skillData.owner}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Repository</div>
                <div className="font-semibold">{skillData.repo}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Category</div>
                <div className="font-semibold capitalize">{skillData.category}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Stars</div>
                <div className="font-semibold text-yellow-400 flex items-center gap-1">
                  ⭐ {skillData.total_stars}
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3 space-y-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Description</div>
                <div className="text-sm text-gray-300 leading-relaxed">{skillData.short_description}</div>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-8">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Tags</div>
              <div className="flex flex-wrap gap-2">
                {skillData.tags.length > 0 ? (
                  skillData.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No tags found</span>
                )}
              </div>
            </div>

            {/* JSON Preview */}
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Full JSON Data</div>
              <div className="bg-black/70 border border-white/5 rounded-xl p-6 overflow-auto max-h-96">
                <pre className="text-xs text-gray-300 font-mono leading-relaxed">
                  {JSON.stringify(skillData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!skillData && !loading && !error && (
          <div className="text-center py-20 text-gray-500">
            <Github className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Enter a GitHub repository URL to extract skill data</p>
          </div>
        )}
      </div>
    </div>
  )
}