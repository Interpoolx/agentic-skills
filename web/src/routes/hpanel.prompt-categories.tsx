import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../components/DataTable'
import { RightDrawer } from '../components/RightDrawer'
import { getApiUrl, getAdminToken } from '../lib/api-config'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/hpanel/prompt-categories')({
    component: PromptCategoriesPage,
})

interface PromptCategory {
    id: string
    slug: string
    name: string
    description: string
    icon: string
    color: string
    promptCount: number
    sortOrder: number
}

function PromptCategoriesPage() {
    const queryClient = useQueryClient()
    const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null)

    const { data: categories = [], isLoading } = useQuery<PromptCategory[]>({
        queryKey: ['admin-prompt-categories'],
        queryFn: async () => {
            const res = await fetch(`${getApiUrl()}/api/admin/prompts/categories`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            })
            return res.json()
        }
    })

    const createMutation = useMutation({
        mutationFn: async (data: Partial<PromptCategory>) => {
            const res = await fetch(`${getApiUrl()}/api/admin/prompts/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAdminToken()}`
                },
                body: JSON.stringify(data)
            })
            if (!res.ok) throw new Error('Failed to create')
            return res.json()
        },
        onSuccess: () => {
            toast.success('Category created!')
            queryClient.invalidateQueries({ queryKey: ['admin-prompt-categories'] })
            setDrawerMode(null)
        },
        onError: () => toast.error('Failed to create category')
    })

    const updateMutation = useMutation({
        mutationFn: async (data: Partial<PromptCategory>) => {
            const res = await fetch(`${getApiUrl()}/api/admin/prompts/categories/${data.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAdminToken()}`
                },
                body: JSON.stringify(data)
            })
            if (!res.ok) throw new Error('Failed to update')
            return res.json()
        },
        onSuccess: () => {
            toast.success('Category updated!')
            queryClient.invalidateQueries({ queryKey: ['admin-prompt-categories'] })
            setDrawerMode(null)
        },
        onError: () => toast.error('Failed to update category')
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${getApiUrl()}/api/admin/prompts/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            })
            if (!res.ok) throw new Error('Failed to delete')
            return res.json()
        },
        onSuccess: () => {
            toast.success('Category deleted!')
            queryClient.invalidateQueries({ queryKey: ['admin-prompt-categories'] })
        },
        onError: () => toast.error('Failed to delete category')
    })

    const columns: ColumnDef<PromptCategory>[] = [
        {
            accessorKey: 'name',
            header: 'Category',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{row.original.icon || '💡'}</span>
                    <div>
                        <div className="font-medium text-white">{row.original.name}</div>
                        <div className="text-xs text-gray-500">{row.original.slug || row.original.id}</div>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => (
                <span className="text-gray-400 text-sm line-clamp-1">{row.original.description || '-'}</span>
            )
        },
        {
            accessorKey: 'promptCount',
            header: 'Prompts',
            cell: ({ row }) => (
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    {row.original.promptCount || 0} prompts
                </span>
            )
        },
        {
            accessorKey: 'sortOrder',
            header: 'Order',
            cell: ({ row }) => (
                <span className="text-gray-400">{row.original.sortOrder || 0}</span>
            )
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => { setSelectedCategory(row.original); setDrawerMode('edit') }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Delete category "${row.original.name}"?`)) {
                                deleteMutation.mutate(row.original.id)
                            }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                    >
                        Delete
                    </button>
                </div>
            )
        }
    ]

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const content = event.target?.result as string
            let importedData: any[] = []

            try {
                if (file.name.endsWith('.json')) {
                    importedData = JSON.parse(content)
                } else {
                    toast.error('Unsupported file format. Please use .json')
                    return
                }

                if (!Array.isArray(importedData)) {
                    toast.error('Invalid data format. Expected an array of categories.')
                    return
                }

                toast.info(`Importing ${importedData.length} categories...`)
                let successCount = 0

                for (const cat of importedData) {
                    try {
                        await createMutation.mutateAsync({
                            name: cat.name,
                            description: cat.description || '',
                            icon: cat.icon || '💡',
                            color: cat.color || '#8b5cf6',
                            sortOrder: cat.sortOrder || 0
                        })
                        successCount++
                    } catch (err) {
                        console.error('Failed to import:', cat.name, err)
                    }
                }

                if (successCount > 0) {
                    toast.success(`Imported ${successCount} categories!`)
                }
            } catch (err) {
                toast.error('Failed to parse file.')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Prompt Categories</h1>
                    <p className="text-gray-400">Manage categories for the AI Prompts Library ({categories.length} total)</p>
                </div>
                <div className="flex gap-3">
                    <label className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-2 cursor-pointer transition-colors border border-gray-600">
                        📥 Import
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={() => { setSelectedCategory(null); setDrawerMode('add') }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                    >
                        ➕ Add Category
                    </button>
                </div>
            </div>

            <DataTable
                data={categories}
                columns={columns}
                searchPlaceholder="Search categories..."
                isLoading={isLoading}
                pageSize={25}
            />

            <RightDrawer
                isOpen={drawerMode === 'add' || drawerMode === 'edit'}
                onClose={() => { setDrawerMode(null); setSelectedCategory(null) }}
                title={drawerMode === 'edit' ? 'Edit Prompt Category' : 'Add Prompt Category'}
            >
                <CategoryForm
                    category={selectedCategory}
                    onSave={(data) => {
                        if (drawerMode === 'edit') updateMutation.mutate(data)
                        else createMutation.mutate(data)
                    }}
                    submitting={createMutation.isPending || updateMutation.isPending}
                />
            </RightDrawer>
        </div>
    )
}

function CategoryForm({
    category,
    onSave,
    submitting
}: {
    category: PromptCategory | null
    onSave: (data: Partial<PromptCategory>) => void
    submitting: boolean
}) {
    const [name, setName] = useState(category?.name || '')
    const [description, setDescription] = useState(category?.description || '')
    const [icon, setIcon] = useState(category?.icon || '💡')
    const [color, setColor] = useState(category?.color || '#8b5cf6')
    const [sortOrder, setSortOrder] = useState(category?.sortOrder || 0)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        onSave({ id: category?.id, name, description, icon, color, sortOrder })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category Name *</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Coding, Writing, Analysis"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this category..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icon (Emoji)</label>
                    <input
                        type="text"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="💡"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort Order</label>
                <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
                {submitting ? 'Saving...' : (category ? 'Update Category' : 'Add Category')}
            </button>
        </form>
    )
}
