import { Link } from '@tanstack/react-router'
import type { MarketplaceData } from '../types'


export function SkillsList({
    data,
    isLoading,
    totalCount,
    currentPage,
    limit,
    onPageChange,
    searchQuery,
    onSearchChange,
    hideControls = false
}: {
    data: MarketplaceData
    isLoading: boolean
    totalCount: number
    currentPage: number
    limit: number
    onPageChange: (page: number) => void
    searchQuery: string
    onSearchChange: (q: string) => void
    hideControls?: boolean
}) {
    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-6">
            {/* Search & Tabs */}
            {!hideControls && (
                <div className="space-y-6">
                    {/* Sleek Search Bar */}
                    <div className="relative group max-w-xl">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search skills..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="block w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 pl-11 pr-12 text-sm focus:ring-0 focus:border-white/20 transition-all placeholder:text-gray-600 text-white shadow-2xl"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <span className="text-[10px] text-gray-600 border border-white/5 rounded px-1.5 py-0.5 font-mono bg-white/5">/</span>
                        </div>
                    </div>


                </div>
            )}

            {/* Sleek Leaderboard Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">
                            <th scope="col" className="px-0 py-4 text-left w-10">#</th>
                            <th scope="col" className="px-4 py-4 text-left">Skill</th>
                            <th scope="col" className="px-4 py-4 text-right">Installs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            Array.from({ length: 12 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-0 py-4 text-xs font-mono text-gray-100">{i + 1}</td>
                                    <td className="px-4 py-4">
                                        <div className="h-4 bg-gray-50 rounded w-48 mb-1"></div>
                                        <div className="h-3 bg-gray-200/20 rounded w-24"></div>
                                    </td>
                                    <td className="px-4 py-4"><div className="h-4 bg-gray-50 rounded w-10 ml-auto"></div></td>
                                </tr>
                            ))
                        ) : data.skills.length > 0 ? (
                            data.skills.map((skill, index) => (
                                <tr key={skill.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-0 py-4 text-[11px] font-mono text-gray-600 align-top pt-5">
                                        {(currentPage * limit + index + 1).toString().padStart(2, '0')}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to="/skills/$owner/$repo/$skillSlug"
                                                    params={{
                                                        owner: skill.owner || 'agentic',
                                                        repo: skill.repo || 'skills',
                                                        skillSlug: skill.skill_slug || skill.id
                                                    }}
                                                    className="text-[15px] font-bold text-white hover:text-gray-300 transition-colors lowercase"
                                                >
                                                    {skill.name}
                                                </Link>
                                                {skill.verified && (
                                                    <svg className="h-3 w-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex items-center text-[12px] font-medium text-gray-500 mt-0.5 lowercase">
                                                <Link
                                                    to="/skills/$owner"
                                                    params={{ owner: (skill as any).github_owner || skill.owner || 'agentic' }}
                                                    className="hover:text-white transition-colors"
                                                >
                                                    {(skill as any).github_owner || skill.owner || 'agentic'}
                                                </Link>
                                                <span className="mx-1 opacity-20">/</span>
                                                <Link
                                                    to="/skills/$owner/$repo"
                                                    params={{ owner: (skill as any).github_owner || skill.owner || 'agentic', repo: (skill as any).github_repo || skill.repo || 'skills' }}
                                                    className="hover:text-white transition-colors"
                                                >
                                                    {(skill as any).github_repo || skill.repo || 'skills'}
                                                </Link>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm font-bold text-gray-400 align-top pt-5 tabular-nums">
                                        {((skill as any).install_count || skill.downloads || 0) >= 1000
                                            ? `${(((skill as any).install_count || skill.downloads || 0) / 1000).toFixed(1)}K`
                                            : (skill as any).install_count || skill.downloads || 0}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-4 py-20 text-center text-gray-400 text-sm font-medium">
                                    No skills found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Compact Pagination */}
            {!isLoading && totalPages > 1 && (
                <div className="pt-8 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 border-t border-white/5">
                    <button
                        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="hover:text-white disabled:opacity-20 transition-all flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        Prev
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-white">Page {currentPage + 1}</span>
                        <span className="opacity-20 lowercase">of</span>
                        <span>{totalPages}</span>
                    </div>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="hover:text-white disabled:opacity-20 transition-all flex items-center gap-1.5"
                    >
                        Next
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}
