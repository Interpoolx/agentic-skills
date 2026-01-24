import { execSync } from 'child_process';
import process from 'process';

const categories = [
    { id: 'business', name: 'Business', description: 'Business applications and enterprise solutions', icon: '💼' },
    { id: 'health', name: 'Health', description: 'Healthcare and medical applications', icon: '🏥' },
    { id: 'education', name: 'Education', description: 'Learning and educational platforms', icon: '📚' },
    { id: 'productivity', name: 'Productivity', description: 'Productivity and workflow tools', icon: '⚡' },
    { id: 'developer', name: 'Developer', description: 'Developer tools and technical specs', icon: '💻' },
    { id: 'creative', name: 'Creative', description: 'Design and creative applications', icon: '🎨' },
    { id: 'operations', name: 'Operations', description: 'Operations and logistics systems', icon: '🔧' },
    { id: 'consumer', name: 'Consumer', description: 'Consumer-facing applications', icon: '🛒' },
    { id: 'other', name: 'Other', description: 'Miscellaneous specifications', icon: '📋' }
];

function seed(remote = false) {
    console.log(`Seeding PRD categories (${remote ? 'REMOTE' : 'LOCAL'})...`);

    // Clear existing (optional, or use ON CONFLICT)
    // For safety, we'll use ON CONFLICT

    for (const cat of categories) {
        const sql = `INSERT INTO prd_categories (id, name, description, icon, prd_count) VALUES ('${cat.id}', '${cat.name}', '${cat.description}', '${cat.icon}', 0) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, icon=excluded.icon;`;

        try {
            const cmd = `npx wrangler d1 execute agentic-skills-db ${remote ? '--remote' : '--local'} --command="${sql.replace(/"/g, '\\"')}"`;
            execSync(cmd, { stdio: 'inherit' });
            console.log(`✅ Seeded: ${cat.name}`);
        } catch (error) {
            console.error(`❌ Failed: ${cat.name}`, error.message);
        }
    }
}

const isRemote = process.argv.includes('--remote');
seed(isRemote);
