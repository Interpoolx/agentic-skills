import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface TOCItem {
    id: string
    title: string
    level: number
}

interface DocsLayoutProps {
    children: ReactNode
    title: string
    description: string
    toc: TOCItem[]
}

const docNav = [
    {
        title: 'Getting Started',
        items: [
            { title: 'Overview', href: '/docs' },
            { title: 'What are Skills?', href: '/docs/what-are-skills' },
        ]
    },
    {
        title: 'Core Concepts',
        items: [
            { title: 'Specification', href: '/docs/specification' },
            { title: 'Integrate Skills', href: '/docs/integrate' },
            { title: 'Create Skills', href: '/docs/create' },
        ]
    },
    {
        title: 'CLI Reference',
        items: [
            { title: 'Installation', href: '/docs/cli-install' },
            { title: 'Commands', href: '/docs/cli-commands' },
        ]
    },
    {
        title: 'Resources',
        items: [
            { title: 'Skills Directory', href: '/skills' },
            { title: 'Submit a Skill', href: '/submit' },
        ]
    }
]

export function DocsLayout({ children, title, description, toc }: DocsLayoutProps) {
    const location = useLocation()
    const currentPath = location.pathname

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20">
            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex">
                    {/* Left Sidebar - Navigation */}
                    <aside className="hidden lg:block w-72 shrink-0 border-r border-white/5">
                        <nav className="sticky top-20 py-10 pr-10 max-h-[calc(100vh-5rem)] overflow-y-auto">
                            {docNav.map((section) => (
                                <div key={section.title} className="mb-6">
                                    <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-4 px-3">
                                        {section.title}
                                    </h5>
                                    <ul className="space-y-1">
                                        {section.items.map((item) => (
                                            <li key={item.href}>
                                                <Link
                                                    to={item.href}
                                                    className={`block py-2 px-3 rounded-xl text-sm transition-all ${currentPath === item.href
                                                        ? 'bg-white text-black font-bold shadow-2xl'
                                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    {item.title}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0 py-12 lg:px-12">
                        <article className="max-w-3xl">
                            <header className="mb-12">
                                <h1 className="text-4xl font-extrabold text-white mb-4 uppercase tracking-tight">{title}</h1>
                                <p className="text-lg text-gray-400 font-medium leading-relaxed">{description}</p>
                            </header>
                            <div className="prose prose-invert max-w-none prose-headings:uppercase prose-headings:tracking-tight prose-a:text-white prose-a:font-bold prose-code:text-white prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/5">
                                {children}
                            </div>
                        </article>
                    </main>

                    {/* Right Sidebar - Table of Contents */}
                    <aside className="hidden xl:block w-64 shrink-0">
                        <div className="sticky top-20 py-12 pl-12 max-h-[calc(100vh-5rem)] overflow-y-auto">
                            <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mb-6">
                                On this page
                            </h5>
                            <nav>
                                <ul className="space-y-3">
                                    {toc.map((item) => (
                                        <li
                                            key={item.id}
                                            style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
                                        >
                                            <a
                                                href={`#${item.id}`}
                                                className="block text-[13px] font-medium text-gray-500 hover:text-white transition-colors"
                                            >
                                                {item.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}

export function CodeBlock({ children, language = 'bash', filename }: { children: string; language?: string; filename?: string }) {
    return (
        <div className="relative group not-prose my-10">
            {filename && (
                <div className="bg-zinc-900 text-gray-500 text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-t-2xl border border-white/5 border-b-0">
                    {filename}
                </div>
            )}
            <pre className={`bg-black text-gray-300 p-6 ${filename ? 'rounded-b-2xl' : 'rounded-2xl'} border border-white/5 overflow-x-auto shadow-2xl font-mono text-sm leading-relaxed`}>
                <code className={`language-${language}`}>{children}</code>
            </pre>
            <button
                onClick={() => navigator.clipboard.writeText(children)}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all bg-white text-black px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-2xl hover:bg-gray-200"
            >
                Copy
            </button>
        </div>
    )
}

export function InfoBox({ type = 'note', title, children }: { type?: 'note' | 'tip' | 'warning'; title?: string; children: ReactNode }) {
    const styles = {
        note: 'bg-zinc-900/40 border-gray-500/20 text-gray-300',
        tip: 'bg-zinc-900/40 border-white/20 text-white',
        warning: 'bg-amber-950/20 border-amber-500/20 text-amber-200',
    }
    const icons = {
        note: 'ℹ️',
        tip: '💡',
        warning: '⚠️',
    }

    return (
        <div className={`border-l-2 p-6 rounded-r-2xl my-10 border border-white/5 ${styles[type]}`}>
            {title && (
                <h5 className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 opacity-80">
                    <span>{icons[type]}</span>
                    {title}
                </h5>
            )}
            <div className="text-sm font-medium leading-relaxed">{children}</div>
        </div>
    )
}

export function FieldTable({ fields }: { fields: { name: string; type: string; required?: boolean; description: string }[] }) {
    return (
        <div className="overflow-x-auto my-10">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="text-left py-4 pr-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">Field</th>
                        <th className="text-left py-4 pr-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">Type</th>
                        <th className="text-left py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Description</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {fields.map((field) => (
                        <tr key={field.name}>
                            <td className="py-5 pr-6">
                                <code className="text-[12px] bg-white/5 border border-white/5 text-white px-2 py-1 rounded-lg font-mono">{field.name}</code>
                                {field.required && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-red-500/80">required</span>}
                            </td>
                            <td className="py-5 pr-6 text-gray-400 font-medium">{field.type}</td>
                            <td className="py-5 text-gray-400 font-medium leading-relaxed">{field.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
