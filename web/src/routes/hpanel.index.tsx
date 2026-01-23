import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { BRANDING } from '../web.config'
import { getApiUrl } from '../lib/api-config'

export const Route = createFileRoute('/hpanel/')({
    component: Dashboard,
})

interface Skill { id: string; name: string; description: string; category: string; author: string; install_count: number }
interface Stats {
    skills: number;
    totalInstalls: number;
    cliInstalls?: number;
    categories: number;
    owners?: number;
    repos?: number;
    prds?: number;
    prompts?: number;
}

function Dashboard() {
    const [stats, setStats] = useState<Stats>({ skills: 0, totalInstalls: 0, categories: 0 })
    const [recentSkills, setRecentSkills] = useState<Skill[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, skillsRes] = await Promise.all([
                    fetch(`${getApiUrl()}/api/stats`).catch(() => null),
                    fetch(`${getApiUrl()}/api/search?limit=5`).catch(() => null)
                ])
                if (statsRes?.ok) setStats(await statsRes.json())
                if (skillsRes?.ok) setRecentSkills((await skillsRes.json()).skills || [])
            } catch (error) {
                console.error('Fetch dashboard data failed:', error)
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400">Welcome to the {BRANDING.brand_name} Registry admin panel</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/hpanel/import"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        📥 Import Skills
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon="📦" label="Total Skills" value={stats.skills} color="blue" />
                <StatCard icon="⬇️" label="Total Installs" value={stats.totalInstalls} color="green" />
                <StatCard icon="💻" label="CLI Installs" value={stats.cliInstalls || 0} color="emerald" />
                <StatCard icon="📁" label="Categories" value={stats.categories} color="purple" />
                <StatCard icon="📄" label="PRD Templates" value={stats.prds || 0} color="orange" />
                <StatCard icon="📝" label="Prompts" value={stats.prompts || 0} color="pink" />
                <StatCard icon="🏢" label="Owners" value={stats.owners || 0} color="cyan" />
                <StatCard icon="🚀" label="Repositories" value={stats.repos || 0} color="indigo" />
            </div>

            {/* Recent Skills */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Recent Skills</h2>
                    <Link to="/hpanel/skills" className="text-sm text-blue-400 hover:text-blue-300 font-medium">View all skills →</Link>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-400">Loading your registry data...</p>
                        </div>
                    ) : recentSkills.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {recentSkills.map((skill) => (
                                <div key={skill.id} className="group flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">⚙️</div>
                                        <div>
                                            <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">{skill.name}</p>
                                            <p className="text-sm text-gray-500">{skill.category} • {skill.author || 'Registry'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium">
                                            {skill.install_count || 0} installs
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-dashed border-gray-700">
                            <div className="text-6xl mb-6 opacity-20">📦</div>
                            <h3 className="text-xl font-bold text-white mb-2">Registry is Empty</h3>
                            <p className="text-gray-400 max-w-sm mx-auto mb-8">
                                Start building your agentic skills library by importing from external sources or adding manual entries.
                            </p>
                            <Link
                                to="/hpanel/import"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all"
                            >
                                📥 Import Your First Skills
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
        green: 'from-green-500 to-green-600 shadow-green-500/20',
        emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
        purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
        orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
        pink: 'from-pink-500 to-pink-600 shadow-pink-500/20',
        cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-500/20',
        indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
    }
    return (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 hover:border-gray-600 transition-all shadow-lg group">
            <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[color as keyof typeof colors]} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-black text-white tabular-nums">{(value || 0).toLocaleString()}</p>
                </div>
            </div>
        </div>
    )
}
