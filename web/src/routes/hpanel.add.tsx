import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/hpanel/add')({
  component: AddSkillPage,
})

const API_URL = 'http://localhost:8787'

function AddSkillPage() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'development',
    author: '',
    github_url: '',
    tags: '',
    source_url: '',
    github_repo: '',
    daily_installs: 0,
    weekly_installs: 0
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSuccess(false)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/admin/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: [{
            id: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            name: form.name,
            description: form.description,
            category: form.category,
            author: { name: form.author, github: form.author },
            source: form.github_url,
            source_url: form.source_url,
            github_repo: form.github_repo,
            daily_installs: Number(form.daily_installs) || 0,
            weekly_installs: Number(form.weekly_installs) || 0,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
            verified: false
          }]
        })
      })

      const data = await res.json()
      if (data.imported > 0) {
        setSuccess(true)
        setForm({
          name: '',
          description: '',
          category: 'development',
          author: '',
          github_url: '',
          tags: '',
          source_url: '',
          github_repo: '',
          daily_installs: 0,
          weekly_installs: 0
        })
      } else {
        setError('Failed to add skill')
      }
    } catch (err) {
      setError('Network error')
    }

    setSubmitting(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Add Skill</h1>
        <p className="text-gray-400">Add a new skill to the registry</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          {success && <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">✅ Skill added successfully!</div>}
          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">❌ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Skill Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., react-best-practices" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
              <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What does this skill do?" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="development">Development</option>
                  <option value="workflow">Workflow</option>
                  <option value="testing">Testing</option>
                  <option value="deployment">Deployment</option>
                  <option value="security">Security</option>
                  <option value="integration">Integration</option>
                  <option value="tools">Tools</option>
                  <option value="productivity">Productivity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Author</label>
                <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="GitHub username or name" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">GitHub URL *</label>
              <input type="url" required value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/user/repo/tree/main/skills/skill-name" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="react, typescript, frontend" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Source URL</label>
                <input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/user/repo/blob/main/SKILL.md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">GitHub Repo</label>
                <input type="text" value={form.github_repo} onChange={(e) => setForm({ ...form, github_repo: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="repo-name" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Daily Installs</label>
                <input type="number" value={form.daily_installs} onChange={(e) => setForm({ ...form, daily_installs: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Weekly Installs</label>
                <input type="number" value={form.weekly_installs} onChange={(e) => setForm({ ...form, weekly_installs: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Skill'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
