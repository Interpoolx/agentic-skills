#!/usr/bin/env node
/**
 * Export Local D1 Database to SQL file using Wrangler JSON output
 * This is more cross-platform compatible than direct sqlite3 access
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'db_local_export_wrangler.sql');
const DB_NAME = "agentic-skills-db";

function runWrangler(command) {
    try {
        console.log(`Running: npx wrangler d1 execute ${DB_NAME} --local --command "${command}" --json`);
        const result = execSync(
            `npx wrangler d1 execute ${DB_NAME} --local --command "${command}" --json`,
            { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }
        );
        return JSON.parse(result);
    } catch (error) {
        console.error(`Error running wrangler command: ${command}`);
        console.error(error.message);
        return null;
    }
}

function escapeValue(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'string' && value.toLowerCase() === 'null') return 'NULL';
    // Escape single quotes by doubling them
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
    console.log('=== Local D1 Database Export via Wrangler ===\n');
    console.log(`Database: ${DB_NAME}`);
    console.log(`Output: ${OUTPUT_FILE}\n`);

    let sqlContent = `-- Agentic Skills Local Database Export\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += `-- Source: Local D1 via Wrangler\n\n`;
    sqlContent += `PRAGMA foreign_keys = OFF;\n\n`;

    // Get all tables
    console.log('Discovering tables...');
    const tablesResult = runWrangler("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts' AND name NOT LIKE '%_config' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content' AND name NOT LIKE '%_docsize' ORDER BY name;");

    if (!tablesResult || !tablesResult[0] || !tablesResult[0].results) {
        console.error('❌ Failed to get tables');
        process.exit(1);
    }

    const tables = tablesResult[0].results.map(r => r.name);
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}\n`);

    for (const tableName of tables) {
        console.log(`Exporting table: ${tableName}...`);

        // Get table schema
        const schemaResult = runWrangler(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        if (!schemaResult || !schemaResult[0] || !schemaResult[0].results || schemaResult[0].results.length === 0) {
            console.log(`  Skipping ${tableName} - no schema found`);
            continue;
        }

        const schema = schemaResult[0].results[0].sql;
        sqlContent += `-- Table: ${tableName}\n`;
        sqlContent += `DROP TABLE IF EXISTS ${tableName};\n`;
        sqlContent += schema + ';\n\n';

        // Get data
        const dataResult = runWrangler(`SELECT * FROM ${tableName}`);
        if (dataResult && dataResult[0] && dataResult[0].results) {
            const rows = dataResult[0].results;
            console.log(`  Found ${rows.length} rows`);

            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                for (const row of rows) {
                    const values = columns.map(col => escapeValue(row[col])).join(', ');
                    sqlContent += `INSERT INTO ${tableName} (${columns.map(c => '`' + c + '`').join(', ')}) VALUES (${values});\n`;
                }
            }
        }
        sqlContent += '\n';
    }

    // Export indexes
    console.log('Exporting indexes...');
    const indexesResult = runWrangler("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'");
    if (indexesResult && indexesResult[0] && indexesResult[0].results) {
        const indexes = indexesResult[0].results;
        if (indexes.length > 0) {
            sqlContent += `-- Indexes\n`;
            for (const idx of indexes) {
                sqlContent += idx.sql + ';\n';
            }
        }
    }

    sqlContent += `\nPRAGMA foreign_keys = ON;\n`;

    fs.writeFileSync(OUTPUT_FILE, sqlContent, 'utf8');
    console.log(`\n✅ Export complete: ${OUTPUT_FILE}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
