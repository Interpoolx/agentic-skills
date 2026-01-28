import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../components/DataTable'
import { RightDrawer } from '../components/RightDrawer'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { getApiUrl, getAdminToken } from '../lib/api-config'
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
  is_featured: number
  hasVariables: number
  status: 'published' | 'draft' | 'archived'
  is_public: number
  is_active: number
  variables?: string | any[]
  createdAt: string
  updatedAt: string
}

const CATEGORIES = ['coding', 'writing', 'analysis', 'business', 'creative', 'education', 'marketing', 'general']
const PROMPT_TYPES = ['instruction', 'system', 'chat', 'completion', 'template']
const COMPLEXITY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']

function PromptsAdminPage() {
  const queryClient = useQueryClient()
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'import' | null>(null)
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
        headers: { 'Authorization': `Bearer ${getAdminToken()}` }
      })
      return res.json()
    }
  })

  const prompts: Prompt[] = Array.isArray(promptsData) ? promptsData : []

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
        headers: { 'Authorization': `Bearer ${getAdminToken()}` }
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
          headers: { 'Authorization': `Bearer ${getAdminToken()}` }
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
            {row.original.is_featured === 1 && <span className="text-yellow-400" title="Featured">⭐</span>}
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
      id: 'is_public',
      header: 'Visibility',
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.original.is_public === 1 ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
          {row.original.is_public === 1 ? 'Public' : 'Private'}
        </span>
      )
    },
    {
      id: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.original.is_active === 1 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {row.original.is_active === 1 ? 'Active' : 'Inactive'}
        </span>
      )
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

  const handleExport = () => {
    const selectedIds = Object.keys(selectedRowIds);
    const itemsToExport = selectedIds.length > 0
      ? prompts.filter(p => selectedRowIds[p.id])
      : sortedPrompts;

    if (itemsToExport.length === 0) {
      toast.error('No items to export');
      return;
    }

    const dataStr = JSON.stringify(itemsToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `prompts_export_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    // Clear selection after export
    if (selectedIds.length > 0) {
      setSelectedRowIds({});
    }

    toast.success(`Exported ${itemsToExport.length} prompts`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Prompts</h1>
          <p className="text-gray-400">Manage all prompts ({totalCount} total)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
          >
            📤 Export {Object.keys(selectedRowIds).length > 0 ? `(${Object.keys(selectedRowIds).length})` : '(All)'}
          </button>
          {Object.keys(selectedRowIds).length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
            >
              🗑️ Delete {Object.keys(selectedRowIds).length}
            </button>
          )}
          <button
            onClick={() => { setDrawerMode('import') }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 border border-gray-600"
          >
            📥 Import
          </button>
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

      {/* Add/Edit/Import Drawer */}
      <RightDrawer
        isOpen={drawerMode !== null}
        onClose={() => { setDrawerMode(null); setSelectedPrompt(null) }}
        title={drawerMode === 'edit' ? 'Edit Prompt' : drawerMode === 'import' ? 'Import Prompts' : 'Add Prompt'}
      >
        {drawerMode === 'import' ? (
          <ImportPromptForm
            onSuccess={() => { setDrawerMode(null); queryClient.invalidateQueries({ queryKey: ['admin-prompts'] }) }}
          />
        ) : (
          <PromptForm
            prompt={selectedPrompt}
            onSuccess={() => { setDrawerMode(null); setSelectedPrompt(null); queryClient.invalidateQueries({ queryKey: ['admin-prompts'] }) }}
          />
        )}
      </RightDrawer>
    </div>
  )
}

interface ImportStatus {
  id: string;
  title: string;
  status: 'pending' | 'success' | 'fail' | 'duplicate';
  message?: string;
}

function ImportPromptForm({ onSuccess }: { onSuccess: () => void }) {
  const [importData, setImportData] = useState<any[]>([])
  const [importStatus, setImportStatus] = useState<ImportStatus[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        const items = Array.isArray(json) ? json : [json]
        setImportData(items)
        setImportStatus(items.map((item: any) => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          title: item.title || 'Untitled',
          status: 'pending'
        })))
      } catch (err) {
        toast.error('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const startImport = async () => {
    if (importData.length === 0) return
    setIsImporting(true)

    const newStatus = [...importStatus]

    for (let i = 0; i < importData.length; i++) {
      const item = importData[i]
      try {
        const res = await fetch(`${getApiUrl()}/api/admin/prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminToken()}`
          },
          body: JSON.stringify({
            ...item,
            id: undefined, // Let backend generate ID or omit to avoid conflicts
            is_public: item.is_public ?? 1,
            is_active: item.is_active ?? 1,
            is_featured: item.is_featured ?? 0,
            createdAt: undefined,
            updatedAt: undefined
          })
        })

        if (res.ok) {
          newStatus[i].status = 'success'
        } else {
          const err = await res.json()
          if (err.error?.includes('duplicate') || res.status === 409) {
            newStatus[i].status = 'duplicate'
            newStatus[i].message = 'Prompt with this slug already exists'
          } else {
            newStatus[i].status = 'fail'
            newStatus[i].message = err.error || 'Failed to save'
          }
        }
      } catch (err) {
        newStatus[i].status = 'fail'
        newStatus[i].message = 'Network error'
      }
      setImportStatus([...newStatus])
    }

    setIsImporting(false)
    toast.success('Import completed')
    setTimeout(() => {
      // Show stats before closing
    }, 2000)
  }

  const sampleJson = [
    {
      "title": "React Performance Expert",
      "slug": "react-perf-expert",
      "description": "Analyze and optimize React codebases",
      "promptText": "Review this React component for performance issues...",
      "category": "coding",
      "promptType": "instruction",
      "complexity": "advanced",
      "status": "published",
      "is_public": 1,
      "is_active": 1,
      "is_featured": 0,
      "variables": [
        {
          "name": "code",
          "description": "The React code to analyze",
          "required": true,
          "default": "// Paste your code here"
        }
      ]
    }
  ]

  const [expandedErrors, setExpandedErrors] = useState<Record<number, boolean>>({})

  const toggleError = (idx: number) => {
    setExpandedErrors(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const copyError = (error: string) => {
    navigator.clipboard.writeText(error)
    toast.success('Error message copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-4">Upload JSON File</label>
        <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-purple-500 transition-colors bg-gray-700/30 group">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="file-upload"
          />
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
          <p className="text-gray-400 text-sm mb-1">Click to upload or drag and drop</p>
          <p className="text-gray-500 text-xs text-center px-4">Ensure the JSON file matches the prompt schema</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-400">Sample Structure</h4>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(sampleJson, null, 2))
              toast.success('Sample JSON copied to clipboard')
            }}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            Copy Sample
          </button>
        </div>
        <pre className="bg-gray-900 p-4 rounded-lg text-[10px] text-gray-400 overflow-x-auto border border-gray-700">
          {JSON.stringify(sampleJson, null, 2)}
        </pre>
      </div>

      {importStatus.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">Import Progress ({importStatus.filter(s => s.status !== 'pending').length}/{importStatus.length})</h4>
          </div>
          <div className="max-h-68 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {importStatus.map((item, idx) => (
              <div key={idx} className="p-2 bg-gray-700/50 rounded border border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{item.title}</p>
                  </div>
                  <div className="ml-3">
                    {item.status === 'pending' && <span className="text-[10px] text-gray-500 uppercase font-bold px-2 py-0.5 rounded bg-gray-800 border border-gray-700 animate-pulse">Pending</span>}
                    {item.status === 'success' && <span className="text-[10px] text-green-400 uppercase font-bold px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">Success</span>}
                    {item.status === 'fail' && <span className="text-[10px] text-red-400 uppercase font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">Failed</span>}
                    {item.status === 'duplicate' && <span className="text-[10px] text-yellow-400 uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">Duplicate</span>}
                  </div>
                </div>
                {item.message && (
                  <div className="mt-1.5 overflow-hidden">
                    <div
                      className="flex items-start justify-between p-1.5 rounded bg-red-900/10 cursor-pointer hover:bg-red-900/20 transition-colors group/msg"
                      onClick={() => toggleError(idx)}
                      title="Click to expand/collapse"
                    >
                      <p className={`text-[10px] text-red-400 leading-relaxed ${expandedErrors[idx] ? '' : 'truncate flex-1'}`}>
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <button
                          className="p-1 text-gray-400 hover:text-white transition-all opacity-0 group-hover/msg:opacity-100"
                          onClick={(e) => { e.stopPropagation(); copyError(item.message!); }}
                          title="Copy error message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        </button>
                        <span className="text-[10px] text-red-400/50">
                          {expandedErrors[idx] ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={startImport}
          disabled={isImporting || importData.length === 0}
          className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isImporting ? 'Importing...' : 'Submit Import'}
        </button>
        {importStatus.length > 0 && !isImporting && (
          <button
            onClick={onSuccess}
            className="px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all border border-gray-600"
          >
            Close
          </button>
        )}
      </div>
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
    is_featured: prompt?.is_featured || 0,
    hasVariables: prompt?.hasVariables || 0,
    is_public: prompt?.is_public ?? 1,
    is_active: prompt?.is_active ?? 1,
    variables: prompt?.variables ? (typeof prompt.variables === 'string' ? prompt.variables : JSON.stringify(prompt.variables, null, 2)) : '[]',
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
        // Update existing prompt
        const res = await fetch(`${getApiUrl()}/api/admin/prompts/${prompt.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminToken()}`
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
            is_featured: form.is_featured,
            hasVariables: form.hasVariables,
            is_public: form.is_public,
            is_active: form.is_active,
            variables: form.variables,
          })
        })

        if (res.ok) {
          setMessage({ type: 'success', text: 'Prompt updated!' })
          toast.success('Prompt updated successfully')
          setTimeout(onSuccess, 1000)
        } else {
          const err = await res.json()
          setMessage({ type: 'error', text: err.error || 'Failed to update prompt' })
        }
      } else {
        // Create new prompt
        const res = await fetch(`${getApiUrl()}/api/admin/prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminToken()}`
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
            is_featured: form.is_featured,
            hasVariables: form.hasVariables,
            is_public: form.is_public,
            is_active: form.is_active,
            variables: form.variables,
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

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Variables (JSON Array)</label>
        <textarea rows={4} value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder='[{"name": "topic", "description": "Subject", "required": true, "default": "AI News"}]' />
        <p className="text-[10px] text-gray-500 mt-1">Define placeholders used in the prompt text.</p>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={form.is_featured === 1} onChange={(e) => setForm({ ...form, is_featured: e.target.checked ? 1 : 0 })}
            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
          Featured
        </label>
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={form.hasVariables === 1} onChange={(e) => setForm({ ...form, hasVariables: e.target.checked ? 1 : 0 })}
            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
          Has Variables
        </label>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={form.is_public === 1} onChange={(e) => setForm({ ...form, is_public: e.target.checked ? 1 : 0 })}
            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
          Public (Visible to everyone)
        </label>
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" checked={form.is_active === 1} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
            className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
          Active
        </label>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
        {submitting ? 'Saving...' : (prompt ? 'Update Prompt' : 'Add Prompt')}
      </button>
    </form>
  )
}
