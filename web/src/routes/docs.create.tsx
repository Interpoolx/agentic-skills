import { createFileRoute, Link } from '@tanstack/react-router'
import { DocsLayout, CodeBlock, InfoBox } from '../components/DocsLayout'
import { BRANDING } from '../web.config'

export const Route = createFileRoute('/docs/create')({
  component: CreateSkill,
})

const toc = [
  { id: 'quick-start', title: 'Quick start', level: 2 },
  { id: 'using-the-cli', title: 'Using the CLI', level: 3 },
  { id: 'manual-creation', title: 'Manual creation', level: 3 },
  { id: 'writing-effective-skills', title: 'Writing effective skills', level: 2 },
  { id: 'structure', title: 'Structure your content', level: 3 },
  { id: 'be-specific', title: 'Be specific', level: 3 },
  { id: 'include-examples', title: 'Include examples', level: 3 },
  { id: 'advanced-features', title: 'Advanced features', level: 2 },
  { id: 'scripts', title: 'Adding scripts', level: 3 },
  { id: 'references', title: 'Reference files', level: 3 },
  { id: 'testing', title: 'Testing your skill', level: 2 },
  { id: 'publishing', title: 'Publishing & Indexing', level: 2 },
  { id: 'github-requirements', title: 'GitHub Requirements', level: 3 },
  { id: 'submission-urls', title: 'Submission URLs', level: 3 },
]

function CreateSkill() {
  return (
    <DocsLayout
      title="Create Skills"
      description="Build custom skills to enhance AI coding assistants with specialized knowledge."
      toc={toc}
    >
      <h2 id="quick-start">Quick start</h2>
      <p>
        Creating a skill is straightforward—it's just a directory with a <code>SKILL.md</code> file.
        You can use the CLI wizard or create one manually.
      </p>

      <h3 id="using-the-cli">Using the CLI</h3>
      <p>The fastest way to create a skill:</p>

      <CodeBlock language="bash">{`npx ${BRANDING.brand_lower_name} create

# Interactive prompts:
? Skill name: my-team-standards
? Description: Our team's coding standards and conventions
? Category: general
? Tags (comma-separated): standards, conventions, team
? Author: Your Name

✅ Created skill at: .agent/skills/my-team-standards/`}</CodeBlock>

      <h3 id="manual-creation">Manual creation</h3>
      <p>Or create the structure yourself:</p>

      <CodeBlock language="bash">{`# Create the directory
mkdir -p .agent/skills/my-skill

# Create SKILL.md
cat > .agent/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: A brief description of what this skill does and when to use it.
---

# My Skill

Instructions for the AI agent...
EOF`}</CodeBlock>

      <h2 id="writing-effective-skills">Writing effective skills</h2>
      <p>
        The quality of your skill depends on how clearly you communicate instructions to the AI.
        Here are best practices:
      </p>

      <h3 id="structure">Structure your content</h3>
      <p>
        Organize with clear headings so the AI can quickly find relevant sections:
      </p>

      <CodeBlock language="markdown" filename="SKILL.md">{`# React Component Standards

## Component Structure
How to organize component files...

## Naming Conventions  
Patterns for naming components, hooks, and files...

## State Management
When to use different state solutions...

## Testing Requirements
What tests are expected for each component...

## Common Patterns
Reusable patterns and examples...`}</CodeBlock>

      <h3 id="be-specific">Be specific</h3>
      <p>
        Vague instructions lead to inconsistent results. Be explicit:
      </p>

      <div className="grid grid-cols-2 gap-4 my-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">✅ Specific</p>
          <CodeBlock language="markdown">{`Use functional components with TypeScript.
Keep components under 200 lines.
Extract custom hooks when logic is 
reused in 2+ components.`}</CodeBlock>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-600 mb-3 uppercase tracking-widest">❌ Vague</p>
          <CodeBlock language="markdown">{`Write clean code.
Keep things simple.
Follow best practices.`}</CodeBlock>
        </div>
      </div>

      <h3 id="include-examples">Include examples</h3>
      <p>
        Show concrete before/after examples:
      </p>

      <CodeBlock language="markdown" filename="SKILL.md">{`## Example: Component with Hooks

### Before (anti-pattern)
\`\`\`tsx
// ❌ Complex logic mixed with rendering
function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then(r => r.json())
      .then(setUser)
      .finally(() => setLoading(false))
  }, [userId])
  
  if (loading) return <Spinner />
  return <div>{user.name}</div>
}
\`\`\`

### After (recommended)
\`\`\`tsx
// ✅ Logic extracted to custom hook
function UserProfile({ userId }) {
  const { user, loading } = useUser(userId)
  
  if (loading) return <Spinner />
  return <div>{user.name}</div>
}

// Custom hook in separate file
function useUser(userId: string) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // ... fetch logic
  return { user, loading }
}
\`\`\``}</CodeBlock>

      <h2 id="advanced-features">Advanced features</h2>

      <h3 id="scripts">Adding scripts</h3>
      <p>
        Include executable scripts for automation:
      </p>

      <CodeBlock language="bash" filename="scripts/setup.sh">{`#!/bin/bash
# Create project structure
mkdir -p src/{components,hooks,utils}
mkdir -p tests/{unit,integration}

echo "✅ Project structure created"`}</CodeBlock>

      <p>Reference scripts in your <code>SKILL.md</code>:</p>

      <CodeBlock language="markdown">{`## Setup

Run the setup script to create the project structure:

\`\`\`bash
./scripts/setup.sh
\`\`\``}</CodeBlock>

      <InfoBox type="warning" title="Script Permissions">
        Remember to make scripts executable: <code>chmod +x scripts/*.sh</code>
      </InfoBox>

      <h3 id="references">Reference files</h3>
      <p>
        Store API documentation, examples, and templates in the <code>references/</code> directory:
      </p>

      <CodeBlock language="text">{`my-skill/
├── SKILL.md
├── references/
│   ├── api-cheatsheet.md
│   ├── component-template.tsx
│   └── test-template.test.tsx`}</CodeBlock>

      <p>Reference them in your skill:</p>

      <CodeBlock language="markdown">{`When creating new components, use the template in 
\`references/component-template.tsx\` as a starting point.`}</CodeBlock>

      <h2 id="testing">Testing your skill</h2>
      <p>
        Before publishing, validate your skill:
      </p>

      <CodeBlock language="bash">{`# Validate format and structure
npx ${BRANDING.brand_lower_name} validate ./my-skill

# Output:
✅ Skill validation passed!
Quality score: 92/100

Checks:
  ✓ SKILL.md exists
  ✓ Valid frontmatter
  ✓ Name matches directory
  ✓ Description is descriptive
  ✓ Body content present
  ⚠ Consider adding examples/`}</CodeBlock>

      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 my-10">
        <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-tight">Need help?</h3>
        <p className="text-gray-400 mb-6 font-medium leading-relaxed">
          The {BRANDING.brand_name} community is here to help you build great skills.
        </p>
        <div className="flex gap-4">
          <a
            href={`https://github.com/${BRANDING.github_org}/${BRANDING.github_repo}/discussions`}
            target="_blank"
            rel="noopener"
            className="text-sm font-bold text-white hover:text-gray-300 transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl"
          >
            Discussions
          </a>
          <a
            href={`https://github.com/${BRANDING.github_org}/${BRANDING.github_repo}/issues`}
            target="_blank"
            rel="noopener"
            className="text-sm font-bold text-white hover:text-gray-300 transition-colors uppercase tracking-widest border border-white/10 px-6 py-3 rounded-xl"
          >
            Report Issue
          </a>
        </div>
      </div>

      <h2 id="publishing">Publishing & Indexing</h2>
      <p>
        To make your skill available in the {BRANDING.brand_name} Registry and accessible via the CLI, it must be hosted
        on a public GitHub repository.
      </p>

      <h3 id="github-requirements">GitHub Requirements</h3>
      <ul>
        <li><strong>Public Repository:</strong> The repository must be public so the registry can fetch the documentation.</li>
        <li><strong>SKILL.md:</strong> Your documentation must be named exactly <code>SKILL.md</code> (case-sensitive).</li>
        <li><strong>Location:</strong> The <code>SKILL.md</code> can be at the root of the repo or in a subdirectory.</li>
      </ul>

      <h3 id="submission-urls">Submission URLs</h3>
      <p>When submitting to the registry, provide the standard GitHub browser URL. Two structures are supported:</p>

      <div className="space-y-4 mb-8">
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
          <p className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Option A: Repository Root</p>
          <p className="text-sm text-gray-500 mb-3">Use this if the repo contains only one skill.</p>
          <code className="text-white text-xs">https://github.com/username/my-cool-skill</code>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
          <p className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Option B: Subdirectory (Monorepo)</p>
          <p className="text-sm text-gray-500 mb-3">Use this if you have multiple skills in one repository.</p>
          <code className="text-white text-xs">https://github.com/username/skills-collection/tree/main/skills/my-skill</code>
        </div>
      </div>

      <h3 id="index-process">The Indexing Process</h3>
      <ol className="space-y-4 mb-8">
        <li>
          <strong>Submit</strong> – Enter your URL on the <Link to="/submit" className="text-white font-bold hover:underline">Submit Skill</Link> page.
        </li>
        <li>
          <strong>Validation</strong> – Our system checks for the <code>SKILL.md</code> file and validates your metadata.
        </li>
        <li>
          <strong>Availability</strong> – Once indexed, your skill is instantly available via the CLI:
          <CodeBlock language="bash">{`npx ${BRANDING.brand_lower_name} install <your-skill-slug>`}</CodeBlock>
        </li>
      </ol>

      <InfoBox type="tip" title="Pro Tip">
        Before submitting, ensure your <code>SKILL.md</code> is visible at the path provided. The registry automatically
        converts your GitHub URL to a raw content URL for documentation loading.
      </InfoBox>
    </DocsLayout>
  )
}
