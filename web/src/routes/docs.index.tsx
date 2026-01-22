import { createFileRoute, Link } from '@tanstack/react-router'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/docs/')({
    component: DocsOverview,
})

function DocsOverview() {
    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-4">
            {/* Hero Section */}
            <section className="mb-24">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-white/5 text-gray-400 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest mb-8 border border-white/5">
                        <span>🚀</span>
                        <span>Agent Skills Specification v1.0</span>
                    </div>
                    <h1 className="text-5xl font-extrabold text-white mb-8 sm:text-7xl uppercase tracking-tight">
                        Universal Skills for AI Coding Agents
                    </h1>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">
                        {BRANDING.brand_name} brings structured, reusable capabilities to AI coding assistants.
                        One skill format, works with 15+ AI tools.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            to="/docs/what-are-skills"
                            className="bg-zinc-900 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest border border-white/10 hover:border-white/20 transition-all shadow-2xl"
                        >
                            Learn About Skills
                        </Link>
                        <a
                            href={`https://www.npmjs.com/package/${BRANDING.npm_package}`}
                            target="_blank"
                            rel="noopener"
                            className="bg-zinc-900 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest border border-white/5 hover:border-white/10 transition-all"
                        >
                            Install CLI
                        </a>
                    </div>
                </div>
            </section>

            {/* Documentation Sections */}
            <section className="max-w-6xl mx-auto mb-32">
                <div className="grid md:grid-cols-3 gap-8">
                    <DocsCard
                        to="/docs/what-are-skills"
                        title="What are Skills?"
                        description="Learn about the concept of portable skills and how they enhance AI agents."
                        icon="❓"
                    />
                    <DocsCard
                        to="/docs/specification"
                        title="Specification"
                        description="The complete technical format for SKILL.md and directory structure."
                        icon="📋"
                    />
                    <DocsCard
                        to="/docs/create"
                        title="Create"
                        description="Step-by-step guide to building your first skill with the CLI."
                        icon="✍️"
                    />
                    <DocsCard
                        to="/docs/integrate"
                        title="Integrate"
                        description="How to add skill support to your own AI coding tool or client."
                        icon="🔌"
                    />
                </div>
            </section>

            {/* Clients Grid */}
            <section className="mb-32">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-6 text-center uppercase">Supported AI Clients</h2>
                    <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto font-medium">
                        {BRANDING.brand_name} works seamlessly with 15+ AI coding tools. One skill format, universal compatibility.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {clients.map(client => (
                            <div key={client.name} className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl flex flex-col items-center gap-4 hover:border-white/10 transition-all">
                                <span className="text-3xl">{client.icon}</span>
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{client.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-4 bg-zinc-950/50 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-16 text-center uppercase">Why {BRANDING.brand_name}?</h2>
                    <div className="grid md:grid-cols-3 gap-12">
                        <FeatureCard
                            icon="🌐"
                            title="Universal Format"
                            description="Write once, use with Cursor, Claude Code, Copilot, Windsurf, and more."
                        />
                        <FeatureCard
                            icon="📦"
                            title="Easy Installation"
                            description={`Install skills with a single command: npx ${BRANDING.brand_lower_name} install <skill-name>`}
                        />
                        <FeatureCard
                            icon="🔄"
                            title="Always in Sync"
                            description="Keep your team on the same page with shared, versioned skill repositories."
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-4xl font-extrabold text-white mb-6 uppercase">Ready to explore?</h2>
                    <p className="text-gray-400 mb-12 text-lg font-medium leading-relaxed">
                        Install the CLI and browse the skills directory.
                    </p>
                    <div className="bg-black text-white rounded-2xl p-6 inline-block mb-12 shadow-2xl">
                        <code className="text-[15px] font-mono">npx {BRANDING.brand_lower_name} search</code>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <Link
                            to="/skills"
                            className="bg-white text-black px-10 py-5 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Browse Skills
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}

function DocsCard({ to, title, description, icon }: { to: string; title: string; description: string; icon: string }) {
    return (
        <Link
            to={to}
            className="group bg-zinc-900/40 border border-white/5 p-10 rounded-3xl hover:border-white/20 transition-all shadow-2xl hover:shadow-white/5"
        >
            <div className="text-4xl mb-8 group-hover:scale-110 transition-transform inline-block">{icon}</div>
            <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">{title}</h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">{description}</p>
        </Link>
    )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="text-center">
            <div className="text-4xl mb-8">{icon}</div>
            <h3 className="text-xl font-extrabold text-white mb-4 uppercase tracking-tight">{title}</h3>
            <p className="text-gray-400 font-medium leading-relaxed">{description}</p>
        </div>
    )
}

const clients = [
    { name: 'Claude Code', icon: '🧠' },
    { name: 'Cursor', icon: '🖱️' },
    { name: 'GitHub Copilot', icon: '🤖' },
    { name: 'Windsurf', icon: '🏄' },
    { name: 'Gemini CLI', icon: '💎' },
    { name: 'Aider', icon: '🔧' },
    { name: 'OpenCode', icon: '📂' },
    { name: 'Codex CLI', icon: '🤯' },
    { name: 'Amp', icon: '⚡' },
    { name: 'Goose', icon: '🪿' },
]
