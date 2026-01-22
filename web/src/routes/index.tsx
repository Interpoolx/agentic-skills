import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SkillsList } from '../components/SkillsList'
import type { MarketplaceData } from '../types'
import { API_URL } from '../constants'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/')({
    component: Index,
})

// CLI Commands data
const CLI_COMMANDS = [
    { cmd: `npx ${BRANDING.brand_lower_name}`, desc: 'Interactive menu - browse and select skills' },
    { cmd: `npx ${BRANDING.brand_lower_name} search <query>`, desc: 'Search for skills by name or keyword' },
    { cmd: `npx ${BRANDING.brand_lower_name} add <owner/repo> --skill <name>`, desc: 'Install specific skill from a repo' },
    { cmd: `npx ${BRANDING.brand_lower_name} install <skill-id>`, desc: 'Install skill by ID or name' },
    { cmd: `npx ${BRANDING.brand_lower_name} list`, desc: 'List all installed skills' },
    { cmd: `npx ${BRANDING.brand_lower_name} list --registry`, desc: 'Show available skills from registry' },
    { cmd: `npx ${BRANDING.brand_lower_name} create`, desc: 'Create a new skill from template' },
    { cmd: `npx ${BRANDING.brand_lower_name} validate`, desc: 'Validate skill format and structure' },
    { cmd: `npx ${BRANDING.brand_lower_name} doctor`, desc: 'Diagnose environment and detect AI tools' },
    { cmd: `npx ${BRANDING.brand_lower_name} sync`, desc: 'Update AGENTS.md with installed skills' },
    { cmd: `npx ${BRANDING.brand_lower_name} read <skill>`, desc: 'Read skill content to stdout' },
    { cmd: `npx ${BRANDING.brand_lower_name} remove <skill>`, desc: 'Remove a specific skill' },
]

// FAQ data
const FAQ_ITEMS = [
    {
        q: 'What are agentic skills?',
        a: 'Agentic skills are structured knowledge packages that give AI coding agents context and capabilities. They follow the SKILL.md specification and can include instructions, examples, and resources.'
    },
    {
        q: 'Which AI agents are supported?',
        a: 'Skills work with Claude Code, Cursor, Windsurf, Codex, Aider, and any AI agent that supports the .agent/skills or .cursor/rules directories.'
    },
    {
        q: 'How do I create my own skill?',
        a: `Run \`npx ${BRANDING.brand_lower_name} create\` to generate a skill from template, then customize the SKILL.md file with your instructions.`
    },
    {
        q: 'Is this free and open source?',
        a: 'Yes! The CLI and registry are 100% open source under MIT license. No accounts, no cloud lock-in, fully local.'
    },
    {
        q: 'How is this different from AGENTS.md?',
        a: 'AGENTS.md is a single file convention. Skills are modular, versioned packages with hierarchy support, validation, and a public registry.'
    },
]

function Index() {
    const [data, setData] = useState<MarketplaceData | null>(null)
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
    const [openFaq, setOpenFaq] = useState<number | null>(null)
    const [installMethod, setInstallMethod] = useState<'npx' | 'npm'>('npx')

    useEffect(() => {
        fetch(`${API_URL}/api/search?limit=25&sort=installs`)
            .then((res) => res.json())
            .then((apiData) => {
                const skills = (apiData.skills || []).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    category: s.category,
                    owner: s.github_owner,
                    repo: s.github_repo,
                    skill_slug: s.skill_slug,
                    tags: typeof s.tags === 'string' ? JSON.parse(s.tags || '[]') : (s.tags || []),
                    source: s.github_url,
                    author: { name: s.author, github: s.github_owner },
                    version: s.version,
                    downloads: s.install_count,
                    verified: s.is_verified === 1,
                    created_at: s.created_at,
                }))
                const categories = [...new Set(skills.map((s: any) => s.category).filter(Boolean))]
                setData({ skills, categories } as MarketplaceData)
            })
            .catch((err) => console.error('Failed to load skills from API:', err))
    }, [])

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedCmd(text)
        setTimeout(() => setCopiedCmd(null), 2000)
    }

    return (
        <div className="bg-black text-white">
            {/* Hero Section */}
            <div className="relative isolate overflow-hidden pt-14">
                <div className="absolute inset-0 -z-10 transform-gpu overflow-hidden blur-3xl opacity-20" aria-hidden="true">
                    <div
                        className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                        style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
                    />
                </div>

                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl uppercase">
                            Supercharge your AI Agent
                        </h1>
                        <p className="mt-8 text-xl leading-8 text-gray-400 font-medium">
                            Discover, deploy, and share high-quality agentic skills. <br />
                            The official marketplace for {BRANDING.brand_name.split(' ')[0]} and modern coding assistants.
                        </p>
                        <div className="mt-12 flex items-center justify-center gap-x-8">
                            <a href="#skills" className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-black shadow-sm hover:bg-gray-200 transition-all">
                                Browse Library
                            </a>
                            <a href="#start" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 transition-all">
                                Get Started
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Start Now CTA Section */}
            <div id="start" className="py-24 sm:py-32 bg-zinc-950 border-y border-white/5">
                <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Get Started</span>
                    </div>

                    <h2 className="text-5xl sm:text-6xl font-black uppercase tracking-tight">
                        <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">START NOW</span>
                    </h2>

                    <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto">
                        One command to install. Instant access to thousands of skills for your AI coding agent.
                    </p>

                    {/* Install Method Toggle */}
                    <div className="mt-10 flex justify-center gap-2">
                        <button
                            onClick={() => setInstallMethod('npx')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${installMethod === 'npx' ? 'bg-white text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                        >
                            npx
                        </button>
                        <button
                            onClick={() => setInstallMethod('npm')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${installMethod === 'npm' ? 'bg-white text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                        >
                            npm
                        </button>
                    </div>

                    {/* Install Command */}
                    <div className="mt-6 flex justify-center">
                        <div
                            onClick={() => copyToClipboard(installMethod === 'npx' ? `npx ${BRANDING.brand_lower_name}` : `npm install -g ${BRANDING.npm_package}`)}
                            className="group relative cursor-pointer rounded-full bg-black border-2 border-indigo-500/50 px-8 py-4 flex items-center gap-4 hover:border-indigo-400 transition-all shadow-lg shadow-indigo-500/10"
                        >
                            <span className="text-indigo-400 font-mono">$</span>
                            <code className="text-lg font-mono text-white">
                                {installMethod === 'npx' ? `npx ${BRANDING.brand_lower_name}` : `npm install -g ${BRANDING.npm_package}`}
                            </code>
                            <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                                {copiedCmd === (installMethod === 'npx' ? `npx ${BRANDING.brand_lower_name}` : `npm install -g ${BRANDING.npm_package}`) ? (
                                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex justify-center gap-4">
                        <a
                            href={`https://github.com/${BRANDING.github_org}/${BRANDING.github_repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                            Star on GitHub
                        </a>
                        <Link
                            to="/docs"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all"
                        >
                            Read Docs
                        </Link>
                    </div>

                    {/* Info Badges */}
                    <div className="mt-10 flex justify-center gap-4 flex-wrap">
                        <div className="px-4 py-2 rounded-full border border-white/10 text-sm">
                            <span className="text-gray-500">SETUP</span> <span className="font-bold text-white">1min</span>
                        </div>
                        <div className="px-4 py-2 rounded-full border border-white/10 text-sm">
                            <span className="text-gray-500">LICENSE</span> <span className="font-bold text-white">MIT</span>
                        </div>
                        <div className="px-4 py-2 rounded-full border border-white/10 text-sm">
                            <span className="text-gray-500">100%</span> <span className="font-bold text-white">Open Source</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 border-b border-white/5">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Built for Agents</h2>
                    <p className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl uppercase">
                        Everything your agent needs to succeed
                    </p>
                </div>
                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-3">
                        <div className="flex flex-col">
                            <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-white uppercase tracking-tight">
                                Verified Quality
                            </dt>
                            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                                <p className="flex-auto">All skills are reviewed for quality, clarity, and safety to ensure your agent gets the best context.</p>
                            </dd>
                        </div>
                        <div className="flex flex-col">
                            <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-white uppercase tracking-tight">
                                Seamless Integration
                            </dt>
                            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                                <p className="flex-auto">Install skills directly via CLI or the VS Code extension with a single command.</p>
                            </dd>
                        </div>
                        <div className="flex flex-col">
                            <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-white uppercase tracking-tight">
                                Open Source
                            </dt>
                            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400">
                                <p className="flex-auto">Powered by the community. Contribute your own skills and help build the ecosystem.</p>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* CLI Commands Section */}
            <div className="py-24 sm:py-32 bg-zinc-900/50 border-b border-white/5">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:mx-0 mb-16">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">CLI Reference</h2>
                        <p className="text-4xl font-bold tracking-tight text-white uppercase">All Commands</p>
                        <p className="mt-4 text-lg text-gray-400">
                            Everything you need to manage skills from your terminal.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CLI_COMMANDS.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => copyToClipboard(item.cmd)}
                                className="group cursor-pointer bg-black/40 border border-white/5 rounded-xl p-5 hover:border-indigo-500/30 hover:bg-black/60 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <code className="text-sm font-mono text-indigo-300 block truncate">{item.cmd}</code>
                                        <p className="text-sm text-gray-500 mt-2">{item.desc}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 text-gray-500 group-hover:text-white transition-colors flex-shrink-0">
                                        {copiedCmd === item.cmd ? (
                                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="py-24 sm:py-32 border-b border-white/5">
                <div className="mx-auto max-w-3xl px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">FAQ</h2>
                        <p className="text-4xl font-bold tracking-tight text-white uppercase">Frequently Asked Questions</p>
                    </div>

                    <div className="space-y-4">
                        {FAQ_ITEMS.map((item, idx) => (
                            <div
                                key={idx}
                                className="border border-white/10 rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                                >
                                    <span className="font-bold text-white">{item.q}</span>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {openFaq === idx && (
                                    <div className="px-6 pb-5 text-gray-400">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Skills Preview Section */}
            <div id="skills" className="bg-black py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl uppercase">
                            SKILLS
                        </h2>
                        <p className="mt-4 text-lg leading-8 text-gray-400 font-medium">
                            Open Agent Skills Marketplace
                        </p>
                    </div>
                    {data ? (
                        <SkillsList
                            data={data}
                            hideControls={true}
                            isLoading={false}
                            totalCount={data.skills.length}
                            currentPage={0}
                            limit={25}
                            onPageChange={() => { }}
                            searchQuery=""
                            onSearchChange={() => { }}
                            sort="installed"
                            onSortChange={() => { }}
                        />
                    ) : (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                    )}
                    <div className="mt-16 text-center">
                        <Link to="/skills" className="text-sm font-bold uppercase tracking-widest text-white hover:opacity-80 transition-opacity">
                            View all skills <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

