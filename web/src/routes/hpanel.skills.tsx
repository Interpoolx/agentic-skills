import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
          {providers.map((p: string) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Owners</option>
          {ownersList.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
          className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Repos</option>
          {reposList.map((r: string) => <option key={r} value={r}>{r}</option>)}
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
  const [owners, setOwners] = useState<{ id: string, slug: string }[]>([]);
  const [repos, setRepos] = useState<{ id: string, slug: string, ownerId?: string }[]>([]);

  const [form, setForm] = useState({
    ownerId: '',
    repoId: skill?.repoId || skill?.repo_id || '',
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
  const [ownersLoaded, setOwnersLoaded] = useState(false);

  // Load owners on mount
  useEffect(() => {
    fetchOwners();
  }, []);

  // After owners load, find the matching owner for this skill (by slug)
  useEffect(() => {
    if (ownersLoaded && skill && owners.length > 0) {
      const ownerSlug = skill.owner || skill.github_owner;
      if (ownerSlug) {
        const matchedOwner = owners.find(o => o.slug === ownerSlug);
        if (matchedOwner && !form.ownerId) {
          setForm(prev => ({ ...prev, ownerId: matchedOwner.id }));
        }
      }
    }
  }, [ownersLoaded, owners, skill]);

  // When ownerId changes, fetch repos
  useEffect(() => {
    if (form.ownerId) {
      fetchRepos(form.ownerId);
    } else {
      setRepos([]);
    }
  }, [form.ownerId]);

  // After repos load, find the matching repo for this skill (by slug or repoId)
  useEffect(() => {
    if (skill && repos.length > 0) {
      const repoSlug = skill.repo || skill.github_repo;
      const repoId = skill.repoId || skill.repo_id;

      if (repoId) {
        const matchedRepo = repos.find(r => r.id === repoId);
        if (matchedRepo && form.repoId !== repoId) {
          setForm(prev => ({ ...prev, repoId: matchedRepo.id }));
        }
      } else if (repoSlug) {
        const matchedRepo = repos.find(r => r.slug === repoSlug);
        if (matchedRepo && !form.repoId) {
          setForm(prev => ({ ...prev, repoId: matchedRepo.id }));
        }
      }
    }
  }, [repos, skill]);

  function fetchOwners() {
    fetch(`${getApiUrl()}/api/admin/owners`, {
      headers: { 'Authorization': 'Bearer ralphy-default-admin-token' }
    })
      .then(res => res.json())
      .then(data => {
        const ownersList = Array.isArray(data) ? data : [];
        setOwners(ownersList);
        setOwnersLoaded(true);
      })
      .catch(console.error);
  }

  function fetchRepos(ownerId: string) {
    fetch(`${getApiUrl()}/api/admin/repos?ownerId=${ownerId}`, {
      headers: { 'Authorization': 'Bearer ralphy-default-admin-token' }
    })
      .then(res => res.json())
      .then(data => {
        setRepos(Array.isArray(data) ? data : []);
      })
      .catch(() => { });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const payload = {
        repoId: form.repoId,
        ownerId: form.ownerId,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Intelligent Import is now seamless */}
      <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/10 mb-6">
        <label className="block text-sm font-medium text-blue-300 mb-2">GitHub Repository URL</label>
        <input
          type="url"
          value={form.githubUrl}
          onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
          placeholder="https://github.com/owner/repo"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          Paste a URL to automatically create identifiers and link Owner/Repo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Owner (Optional)</label>
          <select
            value={form.ownerId}
            onChange={(e) => setForm({ ...form, ownerId: e.target.value, repoId: '' })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Auto-detect from URL</option>
            {owners.map(o => <option key={o.id} value={o.id}>{o.slug}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Repo (Optional)</label>
          <select
            value={form.repoId}
            onChange={(e) => setForm({ ...form, repoId: e.target.value })}
            disabled={!form.ownerId && !form.githubUrl} // Enable if URL present (though repo list won't load, backend handles it)
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Auto-detect / Create</option>
            {repos.map(r => <option key={r.id} value={r.id}>{r.slug}</option>)}
          </select>
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
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress({ stage: 'parsing', total: 0, processed: 0, imported: 0, duplicates: 0, errors: 0, ownersCreated: 0, reposCreated: 0, errorDetails: [] })

    try {
      // Parse the JSON file
      const text = await file.text()
      const data = JSON.parse(text)
      const skills = data.skills || (Array.isArray(data) ? data : [])

      if (skills.length === 0) {
        setProgress(prev => ({ ...prev, stage: 'error', errorDetails: ['No skills found in the JSON file'] }))
        setImporting(false)
        return
      }

      setProgress(prev => ({ ...prev, stage: 'processing', total: skills.length }))

      // Send to backend API for processing
      const res = await fetch(`${getApiUrl()}/api/admin/import-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRANDING.brand_lower_name}-default-admin-token`
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
          setTimeout(onSuccess, 2000)
        }
      } else {
        setProgress(prev => ({
          ...prev,
          stage: 'error',
          errorDetails: [result.error || 'Import failed']
        }))
      }
    } catch (err: any) {
      console.error('Import error:', err)
      setProgress(prev => ({
        ...prev,
        stage: 'error',
        errorDetails: [err.message || 'Failed to parse JSON file']
      }))
    }

    setImporting(false)
  }

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors">
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          id="json-upload"
        />
        <label htmlFor="json-upload" className="cursor-pointer block">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-white font-medium mb-2">
            {file ? file.name : 'Click to select JSON file'}
          </p>
          <p className="text-sm text-gray-400">
            Upload a JSON file with skills array
          </p>
        </label>
      </div>

      {/* Expected Format Info */}
      <div className="bg-gray-800/50 rounded-lg p-4 text-xs">
        <p className="text-gray-400 mb-2 font-medium">Expected format (matches DB schema):</p>
        <pre className="text-gray-500 overflow-x-auto">
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
      "skill_file": "SKILL.md",
      "author": "author-name",
      ...
    }
  ]
}`}
        </pre>
      </div>

      {/* Progress Section */}
      {progress.stage !== 'idle' && (
        <div className={`rounded-lg p-4 border ${progress.stage === 'complete' ? 'bg-green-500/10 border-green-500/30' :
          progress.stage === 'error' ? 'bg-red-500/10 border-red-500/30' :
            'bg-blue-500/10 border-blue-500/30'
          }`}>
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium text-white">
              {progress.stage === 'parsing' && '📖 Parsing file...'}
              {progress.stage === 'processing' && '⚙️ Processing skills...'}
              {progress.stage === 'complete' && '✅ Import Complete'}
              {progress.stage === 'error' && '❌ Import Failed'}
            </span>
            {progress.total > 0 && (
              <span className="text-sm text-gray-400">
                {progress.processed}/{progress.total}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {progress.stage === 'processing' && progress.total > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          )}

          {/* Stats Grid */}
          {(progress.stage === 'complete' || progress.stage === 'error') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{progress.imported}</div>
                <div className="text-xs text-gray-400">Imported</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{progress.duplicates}</div>
                <div className="text-xs text-gray-400">Duplicates</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{progress.ownersCreated}</div>
                <div className="text-xs text-gray-400">New Owners</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{progress.reposCreated}</div>
                <div className="text-xs text-gray-400">New Repos</div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {progress.errorDetails.length > 0 && (
            <div className="text-sm text-red-400 mt-2">
              {progress.errorDetails.slice(0, 5).map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
              {progress.errorDetails.length > 5 && (
                <div className="text-gray-500">...and {progress.errorDetails.length - 5} more errors</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={!file || importing}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {importing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Importing...
          </>
        ) : (
          <>📥 Import Skills</>
        )}
      </button>
    </div>
  )
}

