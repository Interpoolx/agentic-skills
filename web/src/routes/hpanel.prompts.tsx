import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../components/DataTable'
import { RightDrawer } from '../components/RightDrawer'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { getApiUrl } from '../lib/api-config'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/hpanel/prompts')({
  component: PromptsAdminPage,
})

interface Prompt {
  id: string
  slug: string
  title: string
  description: string
  promptText: string
  systemPrompt?: string
  category: string
  tags: string
  promptType: string
  complexity: string
  modelCompatibility?: string
  recommendedModel?: string
  author: string
  viewCount: number
  copyCount: number
  useCount: number
  favoriteCount: number
  averageRating: number
  isFeatured: number
  hasVariables: number
  status: 'published' | 'draft' | 'archived'
  createdAt: string
  updatedAt: string
}

const CATEGORIES = ['coding', 'writing', 'analysis', 'business', 'creative', 'education', 'marketing', 'general']
const PROMPT_TYPES = ['instruction', 'system', 'chat', 'completion', 'template']
const COMPLEXITY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']

function PromptsAdminPage() {
  const queryClient = useQueryClient()
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [sortBy, setSortBy] = useState('copies')
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  })

  // Fetch Prompts
  const { data: promptsData, isLoading } = useQuery({
    queryKey: ['admin-prompts', pagination, searchQuery, categoryFilter, typeFilter, statusFilter, sortBy],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/admin/prompts`, {
        headers: { 'Authorization': 'Bearer ralphy-default-admin-token' }
      })
      return res.json()
    }
  })

  const prompts: Prompt[] = promptsData || []

  // Client-side filtering (since admin endpoint returns all prompts)
  const filteredPrompts = prompts.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false
    if (typeFilter && p.promptType !== typeFilter) return false
    if (statusFilter && p.status !== statusFilter) return false
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      if (!p.title.toLowerCase().includes(search) &&
        !p.description?.toLowerCase().includes(search)) return false
    }
    return true
  })

  // Sort
  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    if (sortBy === 'copies') return (b.copyCount || 0) - (a.copyCount || 0)
    if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0)
    if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0)
    return 0
  })

  const totalCount = sortedPrompts.length

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getApiUrl()}/api/admin/prompts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ralphy-default-admin-token' }
      })
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Prompt deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-prompts'] });
    },
    onError: () => {
      toast.error('Failed to delete prompt');
    }
  })

  // Bulk Delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete one by one since there's no bulk endpoint yet
      for (const id of ids) {
        await fetch(`${getApiUrl()}/api/admin/prompts/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ralphy-default-admin-token' }
        });
      }
      return { count: ids.length };
    },
    onSuccess: (data) => {
      toast.success(`Deleted ${data.count} prompts successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-prompts'] });
      setSelectedRowIds({});
    },
    onError: () => {
      toast.error('Failed to delete prompts');
    }
  })

  const openEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt)
    setDrawerMode('edit')
  }

  const getComplexityBadge = (complexity: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-500/20 text-green-400',
      intermediate: 'bg-yellow-500/20 text-yellow-400',
      advanced: 'bg-orange-500/20 text-orange-400',
      expert: 'bg-red-500/20 text-red-400'
    }
    return colors[complexity] || 'bg-gray-700 text-gray-300'
  }

  const columns: ColumnDef<Prompt>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{row.original.title}</p>
            {row.original.isFeatured === 1 && <span className="text-yellow-400" title="Featured">⭐</span>}
          </div>
          <p className="text-sm text-gray-500 truncate max-w-xs">{row.original.description}</p>
        </div>
      )
    },
    {
      accessorKey: 'promptType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs capitalize">{row.original.promptType}</span>
      )
    },
    {
      accessorKey: 'complexity',
      header: 'Level',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-xs capitalize ${getComplexityBadge(row.original.complexity)}`}>
          {row.original.complexity}
        </span>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs capitalize">{row.original.category}</span>
      )
    },
    {
      accessorKey: 'copyCount',
      header: 'Copies',
      cell: ({ row }) => <span className="text-blue-400">📋 {row.original.copyCount || 0}</span>
    },
    {
      accessorKey: 'viewCount',
      header: 'Views',
      cell: ({ row }) => <span className="text-gray-400">👁️ {row.original.viewCount || 0}</span>
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'published';
        let statusColor = 'bg-gray-700 text-gray-300';
        if (status === 'published') statusColor = 'bg-green-500/20 text-green-400';
        if (status === 'draft') statusColor = 'bg-yellow-500/20 text-yellow-400';
        if (status === 'archived') statusColor = 'bg-red-500/20 text-red-400';

        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor}`}>
            {status}
          </span>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-3">
          <button
            onClick={() => openEdit(row.original)}
            className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-sm"
            title="Edit Prompt"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Delete Prompt',
                message: `Are you sure you want to permanently delete "${row.original.title}"? This action cannot be undone.`,
                onConfirm: () => {
                  deleteMutation.mutate(row.original.id);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              })
            }}
            className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
            title="Delete Prompt"
          >
            🗑️
          </button>
        </div>
      )
    }
  ]

  const handleBulkDelete = () => {
    const selectedIds = Object.keys(selectedRowIds);
    if (selectedIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Prompts',
      message: `Are you sure you want to permanently delete ${selectedIds.length} prompts? This action cannot be undone.`,
      onConfirm: () => {
        bulkDeleteMutation.mutate(selectedIds);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Prompts</h1>
          <p className="text-gray-400">Manage all prompts ({totalCount} total)</p>
        </div>
        <div className="flex gap-3">
          {Object.keys(selectedRowIds).length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
            >
              🗑️ Delete {Object.keys(selectedRowIds).length}
            </button>
          )}
          <button onClick={() => { setSelectedPrompt(null); setDrawerMode('add') }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
            ➕ Add Prompt
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="copies">Most Copied</option>
          <option value="views">Most Viewed</option>
          <option value="rating">Highest Rated</option>
          <option value="recent">Recently Added</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Types</option>
          {PROMPT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      <DataTable
        data={sortedPrompts}
        columns={columns}
        searchPlaceholder="Search prompts..."
        isLoading={isLoading}
        totalCount={totalCount}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPageChange={(pageIndex) => setPagination(prev => ({ ...prev, pageIndex }))}
        onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
        globalFilter={searchQuery}
        onGlobalFilterChange={setSearchQuery}
        rowSelection={selectedRowIds}
        onRowSelectionChange={setSelectedRowIds}
        getRowId={(row) => row.id}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Permanently Delete"
      />

      {/* Add/Edit Drawer */}
      <RightDrawer
        isOpen={drawerMode === 'add' || drawerMode === 'edit'}
        onClose={() => { setDrawerMode(null); setSelectedPrompt(null) }}
        title={drawerMode === 'edit' ? 'Edit Prompt' : 'Add Prompt'}
      >
        <PromptForm
          prompt={selectedPrompt}
          onSuccess={() => { setDrawerMode(null); setSelectedPrompt(null); queryClient.invalidateQueries({ queryKey: ['admin-prompts'] }) }}
        />
      </RightDrawer>
    </div>
  )
}

function PromptForm({ prompt, onSuccess }: { prompt: Prompt | null; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: prompt?.title || '',
    slug: prompt?.slug || '',
    description: prompt?.description || '',
    promptText: prompt?.promptText || '',
    systemPrompt: prompt?.systemPrompt || '',
    category: prompt?.category || 'general',
    promptType: prompt?.promptType || 'instruction',
    complexity: prompt?.complexity || 'intermediate',
    modelCompatibility: prompt?.modelCompatibility || '',
    recommendedModel: prompt?.recommendedModel || '',
    author: prompt?.author || '',
    tags: prompt?.tags ? (typeof prompt.tags === 'string' ? prompt.tags : JSON.stringify(prompt.tags)) : '',
    status: prompt?.status || 'published',
    isFeatured: prompt?.isFeatured || 0,
    hasVariables: prompt?.hasVariables || 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

      if (prompt) {
        // Update existing (not implemented in API yet - would need PATCH endpoint)
        toast.error('Update not implemented yet');
        setSubmitting(false);
        return;
      } else {
        // Create new prompt
        const res = await fetch(`${getApiUrl()}/api/admin/prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ralphy-default-admin-token'
          },
          body: JSON.stringify({
            title: form.title,
            slug: slug,
            description: form.description,
            promptText: form.promptText,
            systemPrompt: form.systemPrompt,
            category: form.category,
            promptType: form.promptType,
            complexity: form.complexity,
            modelCompatibility: form.modelCompatibility,
            recommendedModel: form.recommendedModel,
            author: form.author,
            tags: form.tags,
            status: form.status,
            isFeatured: form.isFeatured,
            hasVariables: form.hasVariables,
          })
        })

        if (res.ok) {
          setMessage({ type: 'success', text: 'Prompt added!' })
          toast.success('Prompt created successfully')
          setTimeout(onSuccess, 1000)
        } else {
          const err = await res.json()
          setMessage({ type: 'error', text: err.error || 'Failed to add prompt' })
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    }

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
        <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Prompt Text *</label>
        <textarea required rows={6} value={form.promptText} onChange={(e) => setForm({ ...form, promptText: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Enter the main prompt content..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">System Prompt (optional)</label>
        <textarea rows={3} value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Optional system prompt..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
          <select value={form.promptType} onChange={(e) => setForm({ ...form, promptType: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            {PROMPT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Complexity</label>
          <select value={form.complexity} onChange={(e) => setForm({ ...form, complexity: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            {COMPLEXITY_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Author</label>
          <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Recommended Model</label>
          <input type="text" value={form.recommendedModel} onChange={(e) => setForm({ ...form, recommendedModel: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="GPT-4, Claude, etc." />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
        <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="coding, productivity, writing" />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={form.isFeatured === 1} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked ? 1 : 0 })}
            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
          Featured
        </label>
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={form.hasVariables === 1} onChange={(e) => setForm({ ...form, hasVariables: e.target.checked ? 1 : 0 })}
            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
          Has Variables
        </label>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
        {submitting ? 'Saving...' : (prompt ? 'Update Prompt' : 'Add Prompt')}
      </button>
    </form>
  )
}
