import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/hpanel')({
    component: HPanelLayout,
})

const AUTH_KEY = 'hpanel_auth'

function HPanelLayout() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const auth = sessionStorage.getItem(AUTH_KEY)
        if (auth === 'true') setIsAuthenticated(true)
        setLoading(false)
    }, [])

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>
    if (!isAuthenticated) return (
        <>
            <LoginPage onLogin={() => setIsAuthenticated(true)} />
            <Toaster position="top-center" richColors />
        </>
    )

    return (
        <>
            <AdminLayout onLogout={() => { sessionStorage.removeItem(AUTH_KEY); setIsAuthenticated(false) }} />
            <Toaster position="top-center" richColors />
        </>
    )
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        if (username === 'admin' && password === 'ralphy2024') {
            sessionStorage.setItem(AUTH_KEY, 'true')
            onLogin()
        } else {
            setError('Invalid credentials')
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center text-2xl">🔐</div>
                    <h1 className="text-2xl font-bold text-white">{BRANDING.brand_name}</h1>
                    <p className="text-gray-400">Admin Panel</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Username" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Password" required />
                    </div>
                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all">Login</button>
                </form>
            </div>
        </div>
    )
}

function AdminLayout({ onLogout }: { onLogout: () => void }) {
    const location = useLocation()
    const currentPath = location.pathname

    const navItems = [
        { icon: '📊', label: 'Dashboard', path: '/hpanel' },
        {
            label: 'Skills Management',
            icon: '🧩',
            children: [
                { label: 'All Skills', path: '/hpanel/skills' },
                { label: 'Owners', path: '/hpanel/owners' },
                { label: 'Repositories', path: '/hpanel/repos' },
                { label: 'Categories', path: '/hpanel/categories' },
                { label: 'Submissions', path: '/hpanel/submissions' },
            ]
        },
        {
            label: 'PRD Management',
            icon: '📋',
            children: [
                { label: 'All PRDs', path: '/hpanel/prds' },
                { label: 'Categories', path: '/hpanel/prd-categories' },
            ]
        },
        {
            label: 'Prompts Library',
            icon: '💡',
            children: [
                { label: 'All Prompts', path: '/hpanel/prompts' },
                { label: 'Categories', path: '/hpanel/prompt-categories' },
            ]
        },
        { icon: '📚', label: 'Docs', path: '/hpanel/docs' },
        { icon: '⚙️', label: 'Settings', path: '/hpanel/settings' },
    ]


    return (
        <div className="min-h-screen bg-gray-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-lg">🚀</div>
                        <div>
                            <h1 className="font-bold text-white">{BRANDING.brand_name}</h1>
                            <p className="text-xs text-gray-400">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    <ul className="space-y-1">
                        {navItems.map((item, idx) => (
                            <li key={idx}>
                                {item.children ? (
                                    <CollapsibleNavItem item={item} currentPath={currentPath} />
                                ) : (
                                    <Link
                                        to={item.path}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPath === item.path
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }`}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm">👤</div>
                        <div>
                            <p className="text-sm font-medium text-white">Admin</p>
                            <p className="text-xs text-gray-400">admin@ralphy.sh</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                        <span>🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    )
}

function CollapsibleNavItem({ item, currentPath }: { item: any; currentPath: string }) {
    const isActive = item.children.some((child: any) => child.path === currentPath);
    const [isOpen, setIsOpen] = useState(isActive);

    useEffect(() => {
        if (isActive) setIsOpen(true);
    }, [isActive]);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-gray-700 hover:text-white`}
            >
                <div className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                </div>
                <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
            </button>
            {isOpen && (
                <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700 pl-2">
                    {item.children.map((child: any) => (
                        <li key={child.path}>
                            <Link
                                to={child.path}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${currentPath === child.path
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <span>{child.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
