import { createFileRoute } from '@tanstack/react-router'
import { DocsLayout, CodeBlock, InfoBox } from '../components/DocsLayout'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/docs/what-are-skills')({
  component: WhatAreSkills,
})

const toc = [
  { id: 'introduction', title: 'Introduction', level: 2 },
  { id: 'the-problem', title: 'The problem', level: 2 },
  { id: 'how-skills-work', title: 'How skills work', level: 2 },
  { id: 'skill-structure', title: 'Skill structure', level: 3 },
  { id: 'example-skill', title: 'Example skill', level: 3 },
  { id: 'benefits', title: 'Benefits', level: 2 },
  { id: 'supported-clients', title: 'Supported clients', level: 2 },
  { id: 'getting-started', title: 'Getting started', level: 2 },
]

function WhatAreSkills() {
  return (
    <DocsLayout
      title="What are Skills?"
      description="Skills are reusable instructions that teach AI coding assistants how to perform specific tasks."
      toc={toc}
    >
      <h2 id="introduction">Introduction</h2>
      <p>
        Skills are <strong>portable instruction files</strong> that enhance AI coding assistants with
        specialized knowledge. They're like plugins for your AI—teaching it your team's conventions,
        best practices, and domain expertise.
      </p>

      <InfoBox type="tip" title="Think of skills as...">
        A senior developer's knowledge, packaged into a file that any AI assistant can read and follow.
      </InfoBox>

      <h2 id="the-problem">The problem</h2>
      <p>
        AI coding assistants are incredibly capable, but they lack context about:
      </p>
      <ul>
        <li>Your team's coding standards and conventions</li>
        <li>Project-specific architectural decisions</li>
        <li>Domain knowledge unique to your industry</li>
        <li>Preferred libraries and patterns</li>
        <li>Common pitfalls and how to avoid them</li>
      </ul>

      <p>
        Without this context, AI assistants give generic advice that may not fit your project.
        You end up repeatedly correcting the same mistakes or explaining the same patterns.
      </p>

      <h2 id="how-skills-work">How skills work</h2>
      <p>
        Skills solve this by providing structured instructions that AI assistants can read and follow.
        When you install a skill, the AI gains access to that knowledge automatically.
      </p>

      <h3 id="skill-structure">Skill structure</h3>
      <p>
        Each skill is a directory containing a <code>SKILL.md</code> file:
      </p>

      <CodeBlock language="text">{`my-skill/
└── SKILL.md        # Required file with instructions

# Optional additions:
├── scripts/        # Executable scripts
├── references/     # Reference documentation
└── assets/         # Images, templates, data`}</CodeBlock>

      <p>
        The <code>SKILL.md</code> file contains YAML frontmatter (metadata) followed by
        Markdown content (instructions):
      </p>

      <CodeBlock language="yaml" filename="SKILL.md">{`---
name: react-components
description: Best practices for building React components
---

# React Component Guidelines

When building React components, follow these patterns...`}</CodeBlock>

      <h3 id="example-skill">Example skill</h3>
      <p>
        Here's a complete example of a skill that teaches an AI how to write React components:
      </p>

      <CodeBlock language="markdown" filename="react-components/SKILL.md">{`---
name: react-components
description: Modern React component patterns and best practices. 
  Use when creating new components or refactoring existing ones.
---

# React Component Guidelines

## Component Structure

Always structure components this way:

1. **Imports** - External first, then internal
2. **Types** - Props interface and internal types
3. **Component** - The main function
4. **Helpers** - Local utility functions

## Patterns to Follow

### Use Functional Components
\`\`\`tsx
// ✅ Good
function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>
}

// ❌ Avoid
class UserCard extends Component { ... }
\`\`\`

### Extract Custom Hooks
When logic is used in 2+ components, extract it:

\`\`\`tsx
// ✅ Reusable hook
function useUser(id: string) {
  const [user, setUser] = useState(null)
  // ... fetch logic
  return { user, loading }
}
\`\`\`

## Naming Conventions

- Components: PascalCase (UserProfile.tsx)
- Hooks: camelCase with "use" prefix (useAuth.ts)
- Utils: camelCase (formatDate.ts)`}</CodeBlock>

      <h2 id="benefits">Benefits</h2>

      <div className="grid md:grid-cols-2 gap-6 my-6">
        <BenefitCard
          icon="📚"
          title="Consistent Output"
          description="AI follows your team's conventions every time, reducing code review friction."
        />
        <BenefitCard
          icon="🔄"
          title="Portable Knowledge"
          description="Skills work across different AI tools—Cursor, Claude Code, Copilot, and more."
        />
        <BenefitCard
          icon="👥"
          title="Team Onboarding"
          description="New team members get AI assistance that already knows your patterns."
        />
        <BenefitCard
          icon="🚀"
          title="Instant Expertise"
          description="Install community skills to gain specialized knowledge immediately."
        />
      </div>

      <h2 id="supported-clients">Supported clients</h2>
      <p>
        Skills work with 15+ AI coding assistants:
      </p>

      <div className="flex flex-wrap gap-3 my-10">
        {clients.map((client) => (
          <span key={client} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {client}
          </span>
        ))}
      </div>

      <InfoBox type="note" title="Universal Format">
        Skills use a standardized format that any AI tool can read. Install once, use everywhere.
      </InfoBox>

      <h2 id="getting-started">Getting started</h2>
      <p>
        Ready to try skills? Here's how to get started:
      </p>

      <CodeBlock language="bash">{`# Install a skill
npx ${BRANDING.brand_lower_name} install frontend-design

# Search for skills
npx ${BRANDING.brand_lower_name} search react

# List installed skills
npx ${BRANDING.brand_lower_name} list`}</CodeBlock>

      <p>
        Or create your own skill:
      </p>

      <CodeBlock language="bash">{`npx ${BRANDING.brand_lower_name} create`}</CodeBlock>

      <div className="flex gap-4 mt-12">
        <a
          href="/docs/specification"
          className="bg-white text-black px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
        >
          View Specification →
        </a>
        <a
          href="/skills"
          className="bg-zinc-900 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest border border-white/5 hover:border-white/10 transition-all"
        >
          Browse Skills
        </a>
      </div>
    </DocsLayout>
  )
}

function BenefitCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-zinc-900/40 p-8 rounded-2xl border border-white/5 shadow-2xl">
      <span className="text-4xl mb-6 block">{icon}</span>
      <h4 className="font-bold text-white mb-2 uppercase tracking-tight">{title}</h4>
      <p className="text-sm text-gray-500 font-medium leading-relaxed">{description}</p>
    </div>
  )
}

const clients = [
  'Claude Code', 'Cursor', 'GitHub Copilot', 'Windsurf', 'Gemini CLI',
  'Aider', 'OpenCode', 'Codex CLI', 'Amp', 'Goose', 'Letta',
  'Antigravity', 'Trae', 'Qoder', 'CodeBuddy'
]
