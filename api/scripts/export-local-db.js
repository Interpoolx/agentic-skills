#!/usr/bin/env node
/**
 * Export Local D1 Database to SQL file
 * Uses better-sqlite3 to access the local miniflare database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', 'ce422b47f69326671218e63a68948e43e74a062eaa88e08c04ab5eb64041d242.sqlite');
const OUTPUT_FILE = path.join(__dirname, '..', 'db_local_export.sql');

function escapeValue(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
    console.log('=== Local D1 Database Export (Safe Copy) ===\n');

    const stateDir = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');

    if (!fs.existsSync(stateDir)) {
        console.error(`❌ Wrangler state directory not found at: ${stateDir}`);
        process.exit(1);
    }

    // Find all sqlite files
    const files = fs.readdirSync(stateDir)
        .filter(f => f.endsWith('.sqlite'))
        .map(f => {
            const p = path.join(stateDir, f);
            const status = fs.statSync(p);
            return { path: p, size: status.size, mtime: status.mtime };
        })
        .sort((a, b) => b.size - a.size || b.mtime - a.mtime);

    if (files.length === 0) {
        console.error('❌ No SQLite files found in wrangler state.');
        process.exit(1);
    }

    // Find the best sqlite file (one with most skills)
    let bestFile = null;
    let maxSkills = -1;

    for (const file of files) {
        try {
            const tempCopy = path.join(__dirname, '..', `temp_check_${path.basename(file.path)}`);
            fs.copyFileSync(file.path, tempCopy);
            const dbCheck = new Database(tempCopy, { readonly: true });
            const count = dbCheck.prepare("SELECT COUNT(*) as c FROM skills").get().c;
            dbCheck.close();
            fs.unlinkSync(tempCopy);

            if (count > maxSkills) {
                maxSkills = count;
                bestFile = file.path;
            }
        } catch (e) {
            // Table might not exist in this file
            console.log(`  (File ${path.basename(file.path)} lacks 'skills' table or is invalid)`);
        }
    }

    if (!bestFile) {
        console.warn('⚠️ No file with "skills" table found. Falling back to the newest/largest file.');
        bestFile = files[0].path;
    }

    const sourceDb = bestFile;
    const tempDb = path.join(__dirname, '..', 'temp_sync.sqlite');

    console.log(`Source: ${sourceDb}`);
    console.log(`Temp Copy: ${tempDb}`);
    console.log(`Output: ${OUTPUT_FILE}\n`);

    // Copy file to avoid locks
    fs.copyFileSync(sourceDb, tempDb);

    const db = new Database(tempDb, { readonly: true });

    let sqlContent = `-- Agentic Skills Local Database Export\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += `-- Source: Local D1 (miniflare)\n\n`;
    sqlContent += `PRAGMA foreign_keys = OFF;\n\n`;

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts' AND name NOT LIKE '%_config' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content' AND name NOT LIKE '%_docsize' ORDER BY name;").all();

    console.log(`Found ${tables.length} tables\n`);

    for (const { name: tableName } of tables) {
        console.log(`Exporting table: ${tableName}...`);

        // Get table schema
        const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
        if (!schema || !schema.sql) continue;

        sqlContent += `-- Table: ${tableName}\n`;
        sqlContent += `DROP TABLE IF EXISTS ${tableName};\n`;
        sqlContent += schema.sql + ';\n\n';

        // Get data
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        console.log(`  Found ${rows.length} rows`);

        if (rows.length > 0) {
            const columns = Object.keys(rows[0]);

            for (const row of rows) {
                const values = columns.map(col => escapeValue(row[col])).join(', ');
                sqlContent += `INSERT INTO ${tableName} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${values});\n`;
            }
        }
        sqlContent += '\n';
    }

    // Export indexes
    console.log('\nExporting indexes...');
    const indexes = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'").all();
    if (indexes.length > 0) {
        sqlContent += `-- Indexes\n`;
        for (const { sql } of indexes) {
            sqlContent += sql + ';\n';
        }
    }

    sqlContent += `\nPRAGMA foreign_keys = ON;\n`;

    fs.writeFileSync(OUTPUT_FILE, sqlContent, 'utf8');
    db.close();

    // Clean up temp file
    try { fs.unlinkSync(tempDb); } catch (e) { }

    console.log(`\n✅ Export complete: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('❌ Export failed:', err);
    process.exit(1);
});
