import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Toaster } from 'sonner'
import { Footer } from '../components/Footer'
import { useState } from 'react'
import { NotFound } from '../components/NotFound'
import { BRANDING } from '../web.config'

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: NotFound,
})

function RootComponent() {
    const [docsOpen, setDocsOpen] = useState(false)
    const location = useLocation()

    // Skip header/footer for admin panel
    if (location.pathname.startsWith('/hpanel')) {
        return (
            <Outlet />
        )
    }

    return (
        <div className="min-h-screen bg-black">
            <nav className="border-b border-white/5 bg-black/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <Link to="/" className="text-xl font-bold text-white hover:opacity-80 transition-opacity">
                                {BRANDING.brand_name}
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex gap-6 items-center">
                            <Link
                                to="/"
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors [&.active]:text-white"
                            >
                                Home
                            </Link>

                            <Link
                                to="/skills"
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors [&.active]:text-white"
                            >
                                Open Skills
                            </Link>
                            <Link
                                to="/prds"
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors [&.active]:text-white"
                            >
                                Open Specs
                            </Link>
                            <Link
                                to="/prompts"
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors [&.active]:text-white"
                            >
                                Prompts
                            </Link>
                            <Link
                                to="/submit"
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors [&.active]:text-white"
                            >
                                Submit
                            </Link>

                            {/* Docs Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setDocsOpen(!docsOpen)}
                                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    Docs
                                    <svg className={`w-4 h-4 transition-transform ${docsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {docsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setDocsOpen(false)} />
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 rounded-lg shadow-xl border border-white/5 py-2 z-50">
                                            <Link
                                                to="/docs"
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                                                onClick={() => setDocsOpen(false)}
                                            >
                                                📚 Overview
                                            </Link>
                                            <Link
                                                to="/docs/what-are-skills"
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                                                onClick={() => setDocsOpen(false)}
                                            >
                                                ❓ What are Skills?
                                            </Link>
                                            <Link
                                                to="/docs/specification"
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                                                onClick={() => setDocsOpen(false)}
                                            >
                                                📋 Specification
                                            </Link>
                                            <Link
                                                to="/docs/integrate"
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                                                onClick={() => setDocsOpen(false)}
                                            >
                                                🔌 Integrate Skills
                                            </Link>
                                            <Link
                                                to="/docs/create"
                                                className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white"
                                                onClick={() => setDocsOpen(false)}
                                            >
                                                🛠️ Create Skills
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>

                            <a
                                href={`https://www.npmjs.com/package/${BRANDING.npm_package}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                NPM ↗
                            </a>
                            <a
                                href="https://open-vsx.org/extension/Ralphysh/ralphy-sh"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                            >
                                Antigravity Kit
                            </a>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setDocsOpen(!docsOpen)} // Reusing docsOpen state for mobile menu toggle to keep it simple or create new state
                                className="text-gray-400 hover:text-white p-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {docsOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {docsOpen && (
                    <div className="md:hidden border-t border-white/5 bg-zinc-900/95 backdrop-blur-xl absolute w-full z-50">
                        <div className="px-4 py-2 space-y-1">
                            <Link to="/" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Home</Link>
                            <Link to="/skills" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Open Skills</Link>
                            <Link to="/prds" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Open Specs</Link>
                            <Link to="/prompts" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Prompts</Link>
                            <Link to="/submit" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Submit</Link>

                            <div className="py-2 border-t border-white/5 mt-2">
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Docs</div>
                                <Link to="/docs" className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Overview</Link>
                                <Link to="/docs/what-are-skills" className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>What are Skills?</Link>
                                <Link to="/docs/specification" className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-md" onClick={() => setDocsOpen(false)}>Specification</Link>
                            </div>

                            <div className="pt-4 pb-2 flex flex-col gap-2">
                                <a href={`https://www.npmjs.com/package/${BRANDING.npm_package}`} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md">NPM ↗</a>
                                <a href="https://open-vsx.org/extension/Ralphysh/ralphy-sh" target="_blank" rel="noopener noreferrer" className="mx-3 mt-1 block text-center bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">Antigravity Kit</a>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            <main>
                <Outlet />
            </main>
            <Footer />
            <Toaster position="top-center" />
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </div>
    )
}
