import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../components/DataTable'
import { RightDrawer } from '../components/RightDrawer'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { ValidationModal } from '../components/ValidationModal'
import { getApiUrl, getAdminToken } from '../lib/api-config'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/hpanel/skills')({
  component: SkillsPage,
})

interface Skill {
  id: string
  name: string
  slug: string
  skill_slug?: string
  namespace: string
  description: string
  shortDescription?: string
  category: string
  author: string
  github_url: string
  githubUrl?: string  // camelCase version from API
  skillFile?: string  // skill_md_url stored here
  skill_file?: string // snake_case version
  stars: number
  downloads: number
  install_count: number
  totalInstalls?: number
  totalStars?: number
  averageRating?: number
  totalReviews?: number
  is_featured: number
  isFeatured?: number
  is_verified: number
  isVerified?: number
  status: 'published' | 'pending' | 'invalid'
  tags: string | string[]
  version: string
  created_at: string
  import_source: string
  platform: string
  metadata: any
  compatibility?: string
  // Hierarchical references
  repoId?: string
  repo_id?: string
  owner?: string      // owner slug from join
  repo?: string       // repo slug from join
  github_owner?: string
  github_repo?: string
}



function SkillsPage() {
  const queryClient = useQueryClient()
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'import' | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [providerFilter, setProviderFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [repoFilter, setRepoFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [sortBy, setSortBy] = useState('relevance')
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
  const [allRecordsSelected, setAllRecordsSelected] = useState(false)

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

  // Fetch skills with server-side pagination and filtering
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['skills', pagination, searchQuery, providerFilter, ownerFilter, repoFilter, categoryFilter, statusFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pagination.pageSize.toString(),
        page: (pagination.pageIndex + 1).toString(),
        q: searchQuery,
        author: providerFilter,
        owner: ownerFilter,
        repo: repoFilter,
        category: categoryFilter,
        status: statusFilter,
        sort: sortBy,
      })
      const res = await fetch(`${getApiUrl()}/api/search?${params.toString()}`)
      return res.json()
    }
  })

  // Fetch all filter options (unique values) for dropdowns
  const { data: filterOptionsData } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/stats/filter-options`)
      return res.json()
    }
  })

  const filterOptions = filterOptionsData || { authors: [], owners: [], repos: [], categories: [] }
  const skills: Skill[] = searchData?.skills || []
  const totalCount = searchData?.pagination?.total || 0

  const providers = filterOptions.authors || []
  const ownersList = filterOptions.owners || []
  const reposList = filterOptions.repos || []
  const categoriesList = filterOptions.categories || []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getApiUrl()}/api/admin/skills/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getAdminToken()}` }
      })
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Skill deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: () => {
      toast.error('Failed to delete skill');
    }
  })

  // Bulk Delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`${getApiUrl()}/api/admin/skills/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Skills deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setSelectedRowIds({});
    },
    onError: () => {
      toast.error('Failed to delete skills');
    }
  })

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const res = await fetch(`${getApiUrl()}/api/admin/skills/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({ is_featured: featured ? 1 : 0 })
      })
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Skill updated');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  })

  const openEdit = (skill: Skill) => {
    setSelectedSkill(skill)
    setDrawerMode('edit')
  }

  // Validation Progress State
  const [validationProgress, setValidationProgress] = useState({
    isOpen: false,
    total: 0,
    processed: 0,
    valid: 0,
    invalid: 0,
    isComplete: false
  })

  // Function to start chunked validation
  const startValidation = async () => {
    try {
      const idsRes = await fetch(`${getApiUrl()}/api/admin/skills/ids`, {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        }
      });
      const { ids } = await idsRes.json();

      setValidationProgress({
        isOpen: true,
        total: ids.length,
        processed: 0,
        valid: 0,
        invalid: 0,
        isComplete: false
      });

      const chunkSize = 20;
      let processedCount = 0;
      let validCount = 0;
      let invalidCount = 0;

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);

        const res = await fetch(`${getApiUrl()}/api/admin/skills/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminToken()}`
          },
          body: JSON.stringify({ ids: chunk })
        });

        const result = await res.json();

        processedCount += chunk.length;
        validCount += result.validCount || 0;
        invalidCount += result.invalidCount || 0;

        setValidationProgress(prev => ({
          ...prev,
          processed: processedCount,
          valid: validCount,
          invalid: invalidCount
        }));
      }

      setValidationProgress(prev => ({ ...prev, isComplete: true }));
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate URLs');
      setValidationProgress(prev => ({ ...prev, isOpen: false }));
    }
  };

  const columns: ColumnDef<Skill>[] = [
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
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const owner = row.original.github_owner || row.original.owner || '';
        const repo = row.original.github_repo || row.original.repo || '';
        const publicUrl = `/skills/${owner}/${repo}/${row.original.slug}`;

        return (
          <div>
            <div className="flex items-center gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {row.original.name}
              </a>
              <a
                href={row.original.github_url || row.original.githubUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-400 transition-colors"
                title="Open GitHub Repository"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <p className="text-sm text-gray-500 truncate max-w-xs">{row.original.description}</p>
          </div>
        )
      }
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm capitalize">{row.original.category}</span>
      )
    },
    {
      accessorKey: 'stars',
      header: 'Stars',
      cell: ({ row }) => <span className="text-yellow-500">⭐ {row.original.stars || 0}</span>
    },
    {
      accessorKey: 'downloads',
      header: 'Downloads',
      cell: ({ row }) => <span className="text-blue-400">📥 {(row.original.downloads || 0).toLocaleString()}</span>
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'published';
        let statusColor = 'bg-gray-700 text-gray-300';
        if (status === 'published') statusColor = 'bg-green-500/20 text-green-400';
        if (status === 'pending') statusColor = 'bg-yellow-500/20 text-yellow-400';
        if (status === 'invalid') statusColor = 'bg-red-500/20 text-red-400';

        return (
          <div className="flex flex-col gap-1.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${statusColor}`}>
              {status}
            </span>
            <div className="flex gap-1">
              {row.original.is_verified ? <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs" title="Verified">✓</span> : null}
              <button
                onClick={() => toggleFeaturedMutation.mutate({ id: row.original.id, featured: !row.original.is_featured })}
                className={`px-2 py-1 rounded text-xs ${row.original.is_featured ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                title={row.original.is_featured ? 'Featured' : 'Mark as Featured'}
              >
                {row.original.is_featured ? '⭐' : '☆'}
              </button>
            </div>
          </div>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEdit(row.original)}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Edit Skill"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Delete Skill',
                message: `Are you sure you want to permanently delete "${row.original.name}"? This action cannot be undone.`,
                onConfirm: () => {
                  deleteMutation.mutate(row.original.id);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              })
            }}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete Skill"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
      title: 'Bulk Delete Skills',
      message: `Are you sure you want to permanently delete ${selectedIds.length} skills? This action cannot be undone.`,
      onConfirm: () => {
        bulkDeleteMutation.mutate(selectedIds);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    })
  }

  // Export skills to JSON
  const handleExport = async (selectedIds: string[]) => {
    try {
      let skillsToExport: Skill[] = [];

      // If all records selected OR Export All clicked with no filter, fetch ALL from API
      if (allRecordsSelected || selectedIds.length === 0) {
        // Use a very high limit to get all records
        const res = await fetch(`${getApiUrl()}/api/search?limit=100000`, {
          headers: { 'Authorization': `Bearer ${BRANDING.brand_lower_name}-default-admin-token` }
        });
        const data = await res.json();
        skillsToExport = data.skills || [];
      } else {
        // If specific IDs selected (partial selection), filter to those from current page
        skillsToExport = skills.filter(s => selectedIds.includes(s.id));
      }

      // Transform to export format matching DB schema
      const exportData = {
        count: skillsToExport.length,
        skills: skillsToExport.map((s: any) => ({
          // Core identifiers
          id: s.id,
          slug: s.slug || s.skill_slug,
          name: s.name,

          // Belongs to
          owner: s.github_owner || s.owner || '',
          repo: s.github_repo || s.repo || '',
          repo_id: s.repo_id || s.repoId || '',

          // Content
          short_description: s.short_description || s.shortDescription || s.description || '',
          category: s.category || 'general',
          tags: typeof s.tags === 'string' ? JSON.parse(s.tags || '[]') : (s.tags || []),

          // URLs
          github_url: s.github_url || s.githubUrl || '',
          skill_file: s.skill_file || s.skillFile || '',

          // Attribution
          author: s.author || '',
          version: s.version || '1.0.0',

          // Stats
          total_installs: s.total_installs || s.totalInstalls || s.install_count || 0,
          total_stars: s.total_stars || s.totalStars || 0,
          average_rating: s.average_rating || s.averageRating || 0,
          total_reviews: s.total_reviews || s.totalReviews || 0,

          // Flags
          is_verified: s.is_verified || s.isVerified || 0,
          is_featured: s.is_featured || s.isFeatured || 0,
          status: s.status || 'published',

          // Compatibility
          compatibility: typeof s.compatibility === 'string' ? s.compatibility : JSON.stringify(s.compatibility || {}),

          // Timestamps
          created_at: s.created_at || s.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skills-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${skillsToExport.length} skills`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export skills');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Skills</h1>
          <p className="text-gray-400">Manage all skills in the {BRANDING.brand_name} Registry ({totalCount} total)</p>
        </div>
        <div className="flex gap-3">
          {(Object.keys(selectedRowIds).length > 0 || allRecordsSelected) && (
            <>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
              >
                🗑️ Delete {allRecordsSelected ? totalCount : Object.keys(selectedRowIds).length}
              </button>
              <button
                onClick={() => handleExport(allRecordsSelected ? [] : Object.keys(selectedRowIds))}
                className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-600 hover:text-white transition-all flex items-center gap-2"
              >
                📤 Export {allRecordsSelected ? totalCount : Object.keys(selectedRowIds).length}
              </button>
            </>
          )}
          {!allRecordsSelected && Object.keys(selectedRowIds).length === 0 && (
            <button
              onClick={() => handleExport([])}
              className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg bg-gray-700 hover:bg-gray-600 hover:text-white transition-all flex items-center gap-2"
              title="Export all skills to JSON"
            >
              📤 Export All ({totalCount})
            </button>
          )}
          <button
            onClick={startValidation}
            disabled={validationProgress.isOpen && !validationProgress.isComplete}
            className={`px-4 py-2 text-gray-300 border border-gray-600 rounded-lg transition-all flex items-center gap-2 ${validationProgress.isOpen && !validationProgress.isComplete
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
              : 'bg-gray-700 hover:bg-gray-600 hover:text-white'
              }`}
            title="Check if all GitHub URLs are still valid"
          >
            {validationProgress.isOpen && !validationProgress.isComplete ? '⌛ Validating...' : '🔍 Validate URLs'}
          </button>
          <button onClick={() => setDrawerMode('import')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
            📥 Import
          </button>
          <button onClick={() => { setSelectedSkill(null); setDrawerMode('add') }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            ➕ Add Skill
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="relevance">Relevance</option>
          <option value="stars">Most Stars</option>
          <option value="installs">Most Installed</option>
          <option value="newest">Recently Added</option>
          <option value="name">Name</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="invalid">Invalid</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Authors</option>
          {(Array.from(new Set(providers)) as string[]).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Owners</option>
          {(Array.from(new Set(ownersList)) as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Repos</option>
          {(Array.from(new Set(reposList)) as string[]).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categoriesList.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <DataTable
        data={skills}
        columns={columns}
        searchPlaceholder="Search skills..."
        isLoading={isLoading}
        totalCount={totalCount}
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        onPageChange={(pageIndex) => setPagination(prev => ({ ...prev, pageIndex }))}
        onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
        globalFilter={searchQuery}
        onGlobalFilterChange={setSearchQuery}
        rowSelection={selectedRowIds}
        onRowSelectionChange={(updater) => {
          setSelectedRowIds(updater);
          setAllRecordsSelected(false); // Clear all-records selection when manually selecting
        }}
        getRowId={(row) => row.id}
        allRecordsSelected={allRecordsSelected}
        onSelectAllRecords={async () => {
          // Fetch all skill IDs and select them
          try {
            const res = await fetch(`${getApiUrl()}/api/admin/skills/ids`, {
              headers: { 'Authorization': `Bearer ${BRANDING.brand_lower_name}-default-admin-token` }
            });
            const data = await res.json();
            const allIds: Record<string, boolean> = {};
            (data.ids || []).forEach((id: string) => { allIds[id] = true; });
            setSelectedRowIds(allIds);
            setAllRecordsSelected(true);
          } catch (err) {
            console.error('Failed to fetch all IDs:', err);
          }
        }}
        onClearAllRecords={() => {
          setSelectedRowIds({});
          setAllRecordsSelected(false);
        }}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Permanently Delete"
      />

      <ValidationModal
        isOpen={validationProgress.isOpen}
        total={validationProgress.total}
        processed={validationProgress.processed}
        valid={validationProgress.valid}
        invalid={validationProgress.invalid}
        isComplete={validationProgress.isComplete}
        onClose={() => setValidationProgress(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Add/Edit Drawer */}
      <RightDrawer
        isOpen={drawerMode === 'add' || drawerMode === 'edit'}
        onClose={() => { setDrawerMode(null); setSelectedSkill(null) }}
        title={drawerMode === 'edit' ? 'Edit Skill' : 'Add Skill'}
      >
        <SkillForm
          skill={selectedSkill}
          onSuccess={() => { setDrawerMode(null); setSelectedSkill(null); queryClient.invalidateQueries({ queryKey: ['skills'] }) }}
        />
      </RightDrawer>

      {/* Import Drawer */}
      <RightDrawer
        isOpen={drawerMode === 'import'}
        onClose={() => setDrawerMode(null)}
        title="Import Skills"
        width="max-w-lg"
      >
        <ImportForm onSuccess={() => { setDrawerMode(null); queryClient.invalidateQueries({ queryKey: ['skills'] }) }} />
      </RightDrawer>
    </div>
  )
}

function SkillForm({ skill, onSuccess }: { skill: Skill | null; onSuccess: () => void }) {


  const [form, setForm] = useState({
    owner: skill?.owner || '',
    repo: skill?.repo || '',
    githubUrl: skill?.githubUrl || skill?.github_url || '',
    skillFile: skill?.skillFile || skill?.skill_file || '',
    name: skill?.name || '',
    skill_slug: skill?.slug || skill?.skill_slug || '',
    description: skill?.shortDescription || skill?.description || '',
    category: skill?.category || 'general',
    tags: (() => {
      const t = skill?.tags;
      if (!t) return '';
      if (typeof t === 'string') {
        try {
          const parsed = JSON.parse(t);
          return Array.isArray(parsed) ? parsed.join(', ') : t;
        } catch {
          return t;
        }
      }
      return Array.isArray(t) ? t.join(', ') : '';
    })(),
    version: skill?.version || '1.0.0',
    status: skill?.status || 'published',
    author: skill?.author || '',
    compatibility: skill?.compatibility || '',
    totalInstalls: skill?.totalInstalls || skill?.install_count || 0,
    totalStars: skill?.totalStars || skill?.stars || 0,
    averageRating: skill?.averageRating || 0,
    totalReviews: skill?.totalReviews || 0,
    isVerified: skill?.isVerified || skill?.is_verified || 0,
    isFeatured: skill?.isFeatured || skill?.is_featured || 0,
    requirements: (() => {
      if (!skill?.compatibility) return '';
      try {
        const comp = typeof skill.compatibility === 'string' ? JSON.parse(skill.compatibility) : skill.compatibility;
        return Array.isArray(comp.requirements) ? comp.requirements.join(', ') : '';
      } catch { return ''; }
    })(),
    compatibleAgents: (() => {
      if (!skill?.compatibility) return '';
      try {
        const comp = typeof skill.compatibility === 'string' ? JSON.parse(skill.compatibility) : skill.compatibility;
        return Array.isArray(comp.agents) ? comp.agents.join(', ') : '';
      } catch { return ''; }
    })(),
  })

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)








  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const payload = {
        repo: form.repo,
        owner: form.owner,
        githubUrl: form.githubUrl,
        skillFile: form.skillFile,  // skill_md_url

        name: form.name,
        slug: form.skill_slug,
        description: form.description,
        author: form.author,
        category: form.category,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
        version: form.version,
        status: form.status,

        // Metrics
        totalInstalls: form.totalInstalls,
        totalStars: form.totalStars,
        averageRating: form.averageRating,
        totalReviews: form.totalReviews,
        isVerified: form.isVerified,
        isFeatured: form.isFeatured,

        // Compatibility
        compatibility: JSON.stringify({
          requirements: typeof form.requirements === 'string' ? form.requirements.split(',').map(s => s.trim()).filter(Boolean) : form.requirements,
          agents: typeof form.compatibleAgents === 'string' ? form.compatibleAgents.split(',').map(s => s.trim()).filter(Boolean) : form.compatibleAgents
        })
      };

      // Use PATCH for updates, POST for new
      const isUpdate = !!skill?.id;
      const url = isUpdate
        ? `${getApiUrl()}/api/admin/skills/${skill.id}`
        : `${getApiUrl()}/api/admin/skills`;

      const res = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRANDING.brand_lower_name}-default-admin-token`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: skill ? 'Skill updated!' : 'Skill added!' })
        setTimeout(onSuccess, 1000)
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save skill' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error' })
    }

    setSubmitting(false)
  }

  // --- GitHub Extraction Logic ---
  const [extractionStatus, setExtractionStatus] = useState<{
    step: 'idle' | 'validating' | 'fetching_repo' | 'scanning_files' | 'complete' | 'error';
    message: string;
    details?: string;
  }>({ step: 'idle', message: '' });

  const parseGitHubInput = (input: string): string | null => {
    const clean = input.trim();
    if (!clean) return null;

    // Handle npx command
    if (clean.startsWith('npx skills add ')) {
      return `https://github.com/${clean.replace('npx skills add ', '').trim()}`
    }

    // Handle full URL
    if (clean.startsWith('http')) return clean;

    // Handle owner/repo format (simple validation: value/value)
    if (/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_\.]+$/.test(clean)) {
      return `https://github.com/${clean}`;
    }

    // Handle catch-all with slash if not just a random string
    if (clean.includes('/')) return `https://github.com/${clean}`;

    return null
  }

  const extractRepoInfo = (url: string) => {
    try {
      // Handle normal github URLs
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/);
      if (match) return { owner: match[1], repo: match[2] };
    } catch (e) { return null; }
    return null;
  }



  const extractMetadata = (content: string, owner: string, isJson = false) => {
    const metadata = {
      name: '',
      description: '',
      category: 'general',
      tags: [] as string[],
      version: '1.0.0',
      author: owner
    }

    if (isJson) {
      try {
        const json = JSON.parse(content);
        metadata.name = json.name || '';
        metadata.description = json.description || '';
        metadata.version = json.version || '1.0.0';
        metadata.author = typeof json.author === 'string' ? json.author : json.author?.name || owner;
        metadata.tags = json.keywords || [];
        if (json.keywords?.includes('ai')) metadata.category = 'ai';
      } catch (e) { }
      return metadata;
    }

    // 1. Try to extract from YAML frontmatter first
    const yamlNameMatch = content.match(/^name:\s*(.+)$/m);
    if (yamlNameMatch) {
      metadata.name = yamlNameMatch[1].trim().replace(/['"]/g, '');
    }

    const yamlDescMatch = content.match(/^description:\s*(?:>|[|])?\n?((?:\s{2,}.+(?:\n|$))+)/m);
    if (yamlDescMatch) {
      metadata.description = yamlDescMatch[1].trim().replace(/\n\s+/g, ' ');
    }

    // 2. Fallback to H1 if no YAML name
    if (!metadata.name) {
      const titleMatch = content.match(/^#\s+(.+)$/m)
      if (titleMatch) {
        const potentialName = titleMatch[1].trim();
        if (potentialName.length < 50 && !potentialName.includes('...')) {
          metadata.name = potentialName;
        }
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

  const handleExtract = async () => {
    setExtractionStatus({ step: 'validating', message: 'Validating input...' });

    const githubUrl = parseGitHubInput(form.githubUrl);
    if (!githubUrl) {
      setExtractionStatus({ step: 'error', message: 'Invalid GitHub URL or format', details: 'Supported formats: URL, owner/repo' });
      return;
    }

    const repoInfo = extractRepoInfo(githubUrl);
    if (!repoInfo) {
      setExtractionStatus({ step: 'error', message: 'Could not extract Owner/Repo', details: 'Ensure URL contains owner/repo' });
      return;
    }

    try {
      const { owner, repo } = repoInfo;

      // 1. Fetch Repo Data
      setExtractionStatus({ step: 'fetching_repo', message: `Fetching repository: ${owner}/${repo}...` });

      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
      if (!repoResponse.ok) throw new Error('Repository not found (Check visibility or spelling)');
      const repoData = await repoResponse.json();

      // 2. Resolve Content (Prioritize SKILL.md > package.json > README.md)
      setExtractionStatus({ step: 'scanning_files', message: 'Scanning for Metadata (SKILL.md / package.json)...' });

      let foundPath = null;
      let foundContent = '';
      let isPackageJson = false;

      // Determine paths to check
      const pathsToCheck = ['SKILL.md', 'skill.md'];

      // smart check for skills/ folder
      try {
        // If we are in a repo that might be a monorepo of skills
        const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/skills`);
        if (contentsResponse.ok) {
          const contents = await contentsResponse.json();
          if (Array.isArray(contents)) {
            // If we find folders in skills/, add SKILL.md check for each
            contents.forEach(item => {
              if (item.type === 'dir') {
                pathsToCheck.push(`skills/${item.name}/SKILL.md`);
              }
            });
          }
        }
      } catch (e) { }

      // Add repo name fallback for skills folder
      pathsToCheck.push(`skills/${repoData.name}/SKILL.md`);

      // Fallbacks
      pathsToCheck.push('package.json');
      pathsToCheck.push('README.md');

      for (const path of pathsToCheck) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch || 'main'}/${path}`;
          const resp = await fetch(rawUrl);
          if (resp.ok) {
            foundPath = path;
            foundContent = await resp.text();
            if (path === 'package.json') isPackageJson = true;
            // If we found a SKILL.md or package.json, use it. Only fallback to README if nothing else found.
            if (!path.toLowerCase().includes('readme')) {
              break;
            }
          }
        } catch (e) { }
      }

      if (!foundPath) {
        setExtractionStatus(prev => ({ ...prev, details: 'Warning: No metadata file found, using Repo data' }));
      }

      // 3. Extract Metadata
      const metadata = foundContent ? extractMetadata(foundContent, owner, isPackageJson) : {
        name: repoData.name,
        description: repoData.description || '',
        category: 'general',
        tags: repoData.topics || [],
        version: '1.0.0',
        author: owner
      };

      // 4. Update Form
      setForm(prev => ({
        ...prev,
        // Prefer extracted name, but fallback to repo name if empty or just "README"
        name: (metadata.name && metadata.name.length < 50) ? metadata.name : repoData.name,
        skill_slug: repoData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: metadata.description || repoData.description || '',
        category: metadata.category,
        tags: metadata.tags.length > 0 ? metadata.tags.join(', ') : (repoData.topics || []).join(', '),
        author: metadata.author,
        version: metadata.version,
        totalStars: repoData.stargazers_count,
        skillFile: (foundPath && foundPath.endsWith('.md'))
          ? `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch || 'main'}/${foundPath}`
          : prev.skillFile,
        // Keep Full URL populated in both places if needed
        githubUrl: githubUrl,

        owner: owner,
        repo: repo,
      }));

      setExtractionStatus({
        step: 'complete',
        message: 'Extraction Successful!',
        details: foundPath ? `Found ${foundPath}` : 'Using Repository Metadata'
      });

      // Clear status after delay
      setTimeout(() => {
        // Only clear if not error
        if (extractionStatus.step !== 'error') {
          setExtractionStatus({ step: 'idle', message: '' });
        }
      }, 3000);

    } catch (err: any) {
      setExtractionStatus({ step: 'error', message: 'Extraction Failed', details: err.message });
    }
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Intelligent Import is now seamless */}
      <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10 mb-6">
        <label className="block text-sm font-medium text-blue-300 mb-2">GitHub Repository</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.githubUrl}
            onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
            placeholder="owner/repo or https://github.com/..."
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={extractionStatus.step !== 'idle' && extractionStatus.step !== 'complete' && extractionStatus.step !== 'error' || !form.githubUrl}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {extractionStatus.step === 'validating' || extractionStatus.step === 'fetching_repo' || extractionStatus.step === 'scanning_files' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Wait
              </span>
            ) : 'Fetch'}
          </button>
        </div>

        {/* Progress/Status Display */}
        {extractionStatus.step !== 'idle' && (
          <div className={`mt-3 p-3 rounded-lg text-sm border ${extractionStatus.step === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
            extractionStatus.step === 'complete' ? 'bg-green-500/10 border-green-500/20 text-green-300' :
              'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}>
            <div className="flex items-center gap-2 font-medium">
              {extractionStatus.step === 'validating' && '🔍 '}
              {extractionStatus.step === 'fetching_repo' && '📦 '}
              {extractionStatus.step === 'scanning_files' && '📄 '}
              {extractionStatus.step === 'complete' && '✅ '}
              {extractionStatus.step === 'error' && '❌ '}
              {extractionStatus.message}
            </div>
            {extractionStatus.details && (
              <div className="mt-1 text-xs opacity-80 pl-6">
                {extractionStatus.details}
              </div>
            )}
          </div>
        )}

        {extractionStatus.step === 'idle' && (
          <p className="text-xs text-gray-500 mt-2">
            Supports: <code>owner/repo</code>, Full URL, or <code>npx skills add...</code>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Owner (GitHub)</label>
          <input
            type="text"
            required
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            placeholder="e.target-owner"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Repo (GitHub)</label>
          <input
            type="text"
            required
            value={form.repo}
            onChange={(e) => setForm({ ...form, repo: e.target.value })}
            placeholder="repo-name"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
          <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Slug *</label>
          <input type="text" required value={form.skill_slug} onChange={(e) => setForm({ ...form, skill_slug: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
        <textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Skill File URL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Skill File URL (SKILL.md)</label>
        <input type="url" value={form.skillFile} onChange={(e) => setForm({ ...form, skillFile: e.target.value })}
          placeholder="https://raw.githubusercontent.com/owner/repo/main/SKILL.md"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
      </div>

      {/* GitHub URL (For Verification) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">GitHub URL (Source)</label>
        <input type="url" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
          placeholder="https://github.com/owner/repo"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Author</label>
          <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Author or organization name"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Version</label>
          <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
            placeholder="1.0.0"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirements (comma-separated)</label>
          <input type="text" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="nodejs>=18, python>=3.10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Compatible Agents (comma-separated)</label>
          <input type="text" value={form.compatibleAgents} onChange={(e) => setForm({ ...form, compatibleAgents: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="claude-code, cursor, aider" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="general">General</option>
            <option value="development">Development</option>
            <option value="workflow">Workflow</option>
            <option value="testing">Testing</option>
            <option value="integration">Integration</option>
            <option value="automation">Automation</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="devops">DevOps</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
        <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="react, typescript, frontend" />
      </div>

      {/* Metrics Section */}
      <div className="pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Metrics</h4>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Installs</label>
            <input type="number" value={form.totalInstalls} onChange={(e) => setForm({ ...form, totalInstalls: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stars</label>
            <input type="number" value={form.totalStars} onChange={(e) => setForm({ ...form, totalStars: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rating</label>
            <input type="number" step="0.1" min="0" max="5" value={form.averageRating} onChange={(e) => setForm({ ...form, averageRating: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reviews</label>
            <input type="number" value={form.totalReviews} onChange={(e) => setForm({ ...form, totalReviews: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.isVerified === 1} onChange={(e) => setForm({ ...form, isVerified: e.target.checked ? 1 : 0 })}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500" />
            Verified
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.isFeatured === 1} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked ? 1 : 0 })}
              className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500" />
            Featured
          </label>
        </div>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {submitting ? 'Saving...' : (skill ? 'Update Skill' : 'Add Skill')}
      </button>
    </form>
  )
}

function ImportForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{
    stage: 'idle' | 'parsing' | 'processing' | 'complete' | 'error'
    total: number
    processed: number
    imported: number
    duplicates: number
    errors: number
    ownersCreated: number
    reposCreated: number
    errorDetails: string[]
  }>({
    stage: 'idle',
    total: 0,
    processed: 0,
    imported: 0,
    duplicates: 0,
    errors: 0,
    ownersCreated: 0,
    reposCreated: 0,
    errorDetails: []
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile)
      setProgress({ ...progress, stage: 'idle', errorDetails: [] })
    } else if (selectedFile) {
      toast.error('Please select a valid JSON file')
    }
  }

  const downloadErrorLog = () => {
    if (progress.errorDetails.length === 0) return
    const blob = new Blob([progress.errorDetails.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-errors-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress({ stage: 'parsing', total: 0, processed: 0, imported: 0, duplicates: 0, errors: 0, ownersCreated: 0, reposCreated: 0, errorDetails: [] })

    try {
      // Parse the JSON file
      const text = await file.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Invalid JSON format: Could not parse file.')
      }

      const skills = data.skills || (Array.isArray(data) ? data : [])

      if (skills.length === 0) {
        setProgress(prev => ({ ...prev, stage: 'error', errorDetails: ['No skills found in the JSON file. Ensure you have a "skills" array.'] }))
        setImporting(false)
        return
      }

      // Basic structural validation before sending to backend
      const invalidSkills = skills.filter((s: any, i: number) => {
        const hasId = s.id || s.slug || s.skill_slug || s.name;
        const hasOwnerRepo = (s.owner && s.repo) || s.github_url || s.source;
        return !hasId || !hasOwnerRepo;
      });

      if (invalidSkills.length > skills.length * 0.5) {
        setProgress(prev => ({
          ...prev,
          stage: 'error',
          errorDetails: [`Validation failed: ${invalidSkills.length} skills appear to be missing required fields (owner, repo, name/slug). Please check the format.`]
        }))
        setImporting(false)
        return
      }

      setProgress(prev => ({ ...prev, stage: 'processing', total: skills.length }))

      // Send to backend API for processing
      const res = await fetch(`${getApiUrl()}/api/admin/import-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify({ skills })
      })

      const result = await res.json()

      if (res.ok) {
        setProgress({
          stage: 'complete',
          total: skills.length,
          processed: skills.length,
          imported: result.imported || 0,
          duplicates: result.duplicates || 0,
          errors: result.errors || 0,
          ownersCreated: result.ownersCreated || 0,
          reposCreated: result.reposCreated || 0,
          errorDetails: result.errorDetails || []
        })
        if (result.imported > 0) {
          toast.success(`Successfully imported ${result.imported} skills!`)
          setTimeout(onSuccess, 3000)
        } else if (result.errors > 0) {
          toast.error(`Import failed with ${result.errors} errors.`)
        }
      } else {
        setProgress(prev => ({
          ...prev,
          stage: 'error',
          errorDetails: [result.error || 'Import failed at backend']
        }))
      }
    } catch (err: any) {
      console.error('Import error:', err)
      setProgress(prev => ({
        ...prev,
        stage: 'error',
        errorDetails: [err.message || 'Failed to process import']
      }))
    }

    setImporting(false)
  }

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-blue-500 bg-blue-500/5' : 'border-gray-600 hover:border-gray-500'
        }`}>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="json-upload"
          disabled={importing}
        />
        <label htmlFor="json-upload" className={`${importing ? 'cursor-not-allowed' : 'cursor-pointer'} block`}>
          <div className="text-4xl mb-4">{file ? '📄' : '📁'}</div>
          <p className="text-white font-medium mb-2">
            {file ? file.name : 'Click to select JSON file'}
          </p>
          <p className="text-sm text-gray-400">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Upload a JSON file with skills array'}
          </p>
        </label>
        {file && !importing && (
          <button
            onClick={() => setFile(null)}
            className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
          >
            Remove file
          </button>
        )}
      </div>

      {/* Expected Format Info */}
      <details className="group">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span> View expected JSON format
        </summary>
        <div className="mt-3 bg-gray-900 rounded-lg p-4 text-[10px] font-mono border border-gray-800">
          <pre className="text-blue-300">
            {`{
  "skills": [
    {
      "name": "Skill Name",
      "slug": "skill-slug",
      "owner": "github-owner",
      "repo": "repo-name",
      "short_description": "...",
      "category": "development",
      "tags": ["tag1", "tag2"],
      "github_url": "https://...",
      "author": "author-name"
    }
  ]
}`}
          </pre>
        </div>
      </details>

      {/* Progress Section */}
      {progress.stage !== 'idle' && (
        <div className={`rounded-xl p-6 border ${progress.stage === 'complete' ? 'bg-green-500/5 border-green-500/20' :
            progress.stage === 'error' ? 'bg-red-500/5 border-red-500/20' :
              'bg-blue-500/5 border-blue-500/20 shadow-lg shadow-blue-500/5'
          }`}>
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-white flex items-center gap-2">
              {progress.stage === 'parsing' && <span className="animate-pulse">📖 Parsing...</span>}
              {progress.stage === 'processing' && <span className="animate-pulse">⚙️ Processing...</span>}
              {progress.stage === 'complete' && <span>✅ Success</span>}
              {progress.stage === 'error' && <span>❌ Failed</span>}
            </span>
            {progress.total > 0 && (
              <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">
                {progress.processed}/{progress.total}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {progress.stage === 'processing' && progress.total > 0 && (
            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-6 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          )}

          {/* Stats Grid */}
          {(progress.stage === 'complete' || (progress.stage === 'error' && progress.processed > 0)) && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="text-xl font-black text-green-400">{progress.imported}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Imported</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="text-xl font-black text-yellow-500">{progress.duplicates}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Updates</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="text-xl font-black text-blue-400">{progress.ownersCreated}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">New Owners</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="text-xl font-black text-red-400">{progress.errors}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Errors</div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {progress.errorDetails.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Error Details</span>
                <button
                  onClick={downloadErrorLog}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-2 py-0.5 rounded transition-colors"
                >
                  Download Log
                </button>
              </div>
              <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-y-auto text-xs font-mono text-red-300/80 space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
                {progress.errorDetails.map((err, i) => (
                  <div key={i} className="border-b border-red-500/5 pb-1 last:border-0">• {err}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      {progress.stage !== 'complete' && (
        <button
          onClick={handleImport}
          disabled={!file || importing}
          className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg ${!file || importing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/20 active:scale-[0.98]'
            }`}
        >
          {importing ? (
            <>
              <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Running Import...</span>
            </>
          ) : (
            <>
              <span className="text-xl">📥</span>
              <span>Start Skills Import</span>
            </>
          )}
        </button>
      )}

      {progress.stage === 'complete' && (
        <button
          onClick={onSuccess}
          className="w-full py-4 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-all shadow-lg"
        >
          Done
        </button>
      )}
    </div>
  )
}

