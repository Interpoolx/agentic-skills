import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { API_URL } from '../constants'
import { getAdminToken } from '../lib/api-config'
import { DataTable } from '../components/DataTable'
import { ConfirmationModal } from '../components/ConfirmationModal'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/hpanel/owners')({
  component: OwnersPage,
})

interface Owner {
  id: string
  name: string
  slug: string
  description: string
  githubUrl: string
  website: string
  avatarUrl: string
  totalRepos: number
  totalSkills: number
  createdAt: string
}

function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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

  useEffect(() => {
    fetchOwners()
  }, [])

  function fetchOwners() {
    setLoading(true)
    fetch(`${API_URL}/api/admin/owners`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || getAdminToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        setOwners(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        toast.error('Failed to load owners')
        setLoading(false)
      })
  }

  const columns = useMemo<ColumnDef<Owner>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.avatarUrl ? (
            <img src={row.original.avatarUrl} alt={row.original.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
              {row.original.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <a
              href={row.original.githubUrl || `https://github.com/${row.original.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-white hover:text-blue-400 transition-colors inline-flex items-center gap-1"
            >
              {row.original.name}
              <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <div className="text-xs text-gray-500">{row.original.slug}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span className="text-gray-400 truncate block max-w-xs" title={row.original.description}>{row.original.description || '-'}</span>
    },
    {
      id: 'stats',
      header: 'Stats',
      cell: ({ row }) => (
        <div className="flex gap-3 text-xs text-gray-400">
          <span title="Total Repositories">📦 {row.original.totalRepos || 0}</span>
          <span title="Total Skills">🛠️ {row.original.totalSkills || 0}</span>
        </div>
      )
    },
    {
      accessorKey: 'website',
      header: 'Links',
      cell: ({ row }) => (
        <div className="flex gap-2 text-xs">
          {row.original.githubUrl && <a href={row.original.githubUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">GitHub</a>}
          {row.original.website && <a href={row.original.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">Website</a>}
        </div>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => <span className="text-gray-500 text-xs">{new Date(row.original.createdAt).toLocaleDateString()}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedOwner(row.original)
              setIsCreating(true)
            }}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Edit Owner"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Delete Owner',
                message: `Are you sure you want to delete ${row.original.name}? This will cascade delete associated Repos and Skills.`,
                onConfirm: () => deleteOwner(row.original.id)
              })
            }}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete Owner"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )
    }
  ], [])

  function deleteOwner(id: string) {
    fetch(`${API_URL}/api/admin/owners/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || getAdminToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Owner deleted')
          fetchOwners()
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        } else {
          toast.error(data.error || 'Failed to delete')
        }
      })
  }

  async function handleRefreshStats() {
    const loadingToast = toast.loading('Recalculating stats...')
    try {
      const res = await fetch(`${API_URL}/api/admin/stats/recalculate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || getAdminToken()}` }
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Stats recalculated successfully', { id: loadingToast })
        fetchOwners()
      } else {
        toast.error(data.error || 'Failed to recalulate', { id: loadingToast })
      }
    } catch (err) {
      toast.error('Network error', { id: loadingToast })
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Owners</h1>
          <p className="text-gray-400">Manage skill owners and organizations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshStats}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🔄</span> Refresh Stats
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>+</span> New Owner
          </button>
        </div>
      </div>

      <DataTable
        data={owners}
        columns={columns}
        searchPlaceholder="Search owners..."
        isLoading={loading}
        globalFilter={searchQuery}
        onGlobalFilterChange={setSearchQuery}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Delete Owner"
      />

      {isCreating && (
        <OwnerModal
          owner={selectedOwner}
          onClose={() => {
            setIsCreating(false)
            setSelectedOwner(null)
          }}
          onSuccess={() => {
            setIsCreating(false)
            setSelectedOwner(null)
            fetchOwners()
          }}
        />
      )}
    </div>
  )
}

function OwnerModal({ owner, onClose, onSuccess }: { owner: Owner | null, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: owner?.name || '',
    slug: owner?.slug || '',
    description: owner?.description || '',
    githubUrl: owner?.githubUrl || '',
    website: owner?.website || '',
    avatarUrl: owner?.avatarUrl || ''
  })
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const url = owner ? `${API_URL}/api/admin/owners/${owner.id}` : `${API_URL}/api/admin/owners`
    const method = owner ? 'PATCH' : 'POST'

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token') || getAdminToken()}`
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(owner ? 'Owner updated successfully' : 'Owner created successfully')
          onSuccess()
        } else {
          toast.error(data.error || `Failed to ${owner ? 'update' : 'create'} owner`)
        }
      })
      .catch(() => toast.error('Check console for details'))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{owner ? 'Edit Owner' : 'Create New Owner'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name *</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Slug *</label>
              <input
                required
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="e.g. vercel-labs"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">GitHub URL</label>
            <input
              type="url"
              value={formData.githubUrl}
              onChange={e => setFormData({ ...formData, githubUrl: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="https://github.com/..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? (owner ? 'Updating...' : 'Creating...') : (owner ? 'Update Owner' : 'Create Owner')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
