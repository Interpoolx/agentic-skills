import { useState } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
} from '@tanstack/react-table'

interface DataTableProps<T> {
    data: T[]
    columns: ColumnDef<T, any>[]
    searchPlaceholder?: string
    searchColumn?: string
    pageSize?: number
    isLoading?: boolean
    totalCount?: number
    pageIndex?: number
    onPageChange?: (index: number) => void
    onPageSizeChange?: (size: number) => void
    globalFilter?: string
    onGlobalFilterChange?: (filter: string) => void
    rowSelection?: Record<string, boolean>
    onRowSelectionChange?: (updater: any) => void
    getRowId?: (row: T) => string
    onSelectAllRecords?: () => void
    allRecordsSelected?: boolean
    onClearAllRecords?: () => void
}

export function DataTable<T>({
    data,
    columns,
    searchPlaceholder = 'Search...',
    pageSize = 10,
    isLoading = false,
    totalCount,
    pageIndex = 0,
    onPageChange,
    onPageSizeChange,
    globalFilter: externalGlobalFilter,
    onGlobalFilterChange: onExternalGlobalFilterChange,
    rowSelection,
    onRowSelectionChange,
    getRowId,
    onSelectAllRecords,
    allRecordsSelected,
    onClearAllRecords,
}: DataTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [internalGlobalFilter, setInternalGlobalFilter] = useState('')

    const isManual = totalCount !== undefined
    const actualGlobalFilter = onExternalGlobalFilterChange ? externalGlobalFilter : internalGlobalFilter
    const setActualGlobalFilter = onExternalGlobalFilterChange ? onExternalGlobalFilterChange : setInternalGlobalFilter

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter: actualGlobalFilter,
            rowSelection,
            ...(isManual ? { pagination: { pageIndex, pageSize } } : {})
        },
        initialState: {
            pagination: { pageSize }
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setActualGlobalFilter,
        onRowSelectionChange,
        getRowId,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: true,
        manualPagination: isManual,
        pageCount: isManual ? Math.ceil(totalCount / pageSize) : undefined,
        onPaginationChange: (updater) => {
            if (typeof updater === 'function') {
                const newState = updater({ pageIndex, pageSize })
                if (newState.pageIndex !== pageIndex) onPageChange?.(newState.pageIndex)
                if (newState.pageSize !== pageSize) onPageSizeChange?.(newState.pageSize)
            }
        }
    })

    // Check if all rows on current page are selected
    const currentPageRowIds = data.map((row, index) => getRowId ? getRowId(row) : String(index))
    const allCurrentPageSelected = currentPageRowIds.length > 0 &&
        currentPageRowIds.every(id => rowSelection?.[id])
    const showSelectAllBanner = allCurrentPageSelected &&
        totalCount !== undefined &&
        totalCount > data.length &&
        !allRecordsSelected &&
        onSelectAllRecords

    return (
        <div className="space-y-4">
            {/* Search & Page Size */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={actualGlobalFilter}
                    onChange={(e) => setActualGlobalFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-80"
                />
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">Show:</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {[10, 25, 50, 100].map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Select All Records Banner */}
            {showSelectAllBanner && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-blue-300 text-sm">
                        All {data.length} items on this page are selected.
                    </span>
                    <button
                        onClick={onSelectAllRecords}
                        className="text-blue-400 hover:text-blue-300 font-medium text-sm underline"
                    >
                        Select all {totalCount?.toLocaleString()} records
                    </button>
                </div>
            )}

            {/* All Records Selected Banner */}
            {allRecordsSelected && totalCount && onClearAllRecords && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-green-300 text-sm">
                        ✓ All {totalCount.toLocaleString()} records are selected.
                    </span>
                    <button
                        onClick={onClearAllRecords}
                        className="text-green-400 hover:text-green-300 font-medium text-sm underline"
                    >
                        Clear selection
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-700/50">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <th
                                                key={header.id}
                                                className="text-left py-4 px-6 text-sm font-medium text-gray-300 cursor-pointer select-none hover:bg-gray-700/30"
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {{
                                                        asc: ' ↑',
                                                        desc: ' ↓',
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.length > 0 ? (
                                    table.getRowModel().rows.map((row) => (
                                        <tr key={row.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="py-4 px-6">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length} className="py-8 text-center text-gray-400">
                                            No data found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-400">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                    {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                    )}{' '}
                    of {table.getFilteredRowModel().rows.length} entries
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ««
                    </button>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        «
                    </button>
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                        {table.getState().pagination.pageIndex + 1}
                    </span>
                    <span className="text-gray-400">of {table.getPageCount()}</span>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        »
                    </button>
                    <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        »»
                    </button>
                </div>
            </div>
        </div>
    )
}

