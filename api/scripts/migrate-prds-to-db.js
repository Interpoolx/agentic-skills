import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../');
const WEB_SPECS_DIR = path.join(ROOT_DIR, 'web/specs');

/**
 * Script to migrate markdown content from files to the D1 database.
 * This script generates SQL statements that can be executed via wrangler.
 */
async function generateMigrationSql() {
    const categories = fs.readdirSync(WEB_SPECS_DIR);
    let sql = '-- PRD Content Migration SQL\n';
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;

    for (const category of categories) {
        const categoryPath = path.join(WEB_SPECS_DIR, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const files = fs.readdirSync(categoryPath);
        for (const file of files) {
            if (!file.endsWith('.md')) continue;

            const filePath = path.join(categoryPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Escape single quotes for SQL
            const escapedContent = content.replace(/'/g, "''");

            // Generate UPDATE statement using slug derived from filename
            const slug = file.replace('.md', '');

            sql += `-- Migrating ${slug}\n`;
            sql += `UPDATE prds SET content = '${escapedContent}' WHERE slug = '${slug}';\n\n`;
        }
    }

    const outputPath = path.join(ROOT_DIR, 'api/migrate-content.sql');
    fs.writeFileSync(outputPath, sql, 'utf-8');
    console.log(`Migration SQL written to ${outputPath}`);
}

generateMigrationSql().catch(console.error);
