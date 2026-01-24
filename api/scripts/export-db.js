#!/usr/bin/env node
/**
 * Export D1 Database to SQL file
 * Since D1 export doesn't support FTS5 tables, we manually export each table
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '..', 'db_export.sql');
const DB_NAME = 'agentic-skills-db';

// Tables to export (excluding FTS virtual tables)
const TABLES = [
    'skills',
    'installs',
    'categories',
    'skill_submissions',
    'prds',
    'prd_categories'
];

function runQuery(sql) {
    try {
        const result = execSync(
            `npx wrangler d1 execute ${DB_NAME} --remote --json --command "${sql.replace(/"/g, '\\"')}"`,
            { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
        );
        return JSON.parse(result);
    } catch (error) {
        console.error(`Error running query: ${sql}`);
        console.error(error.message);
        return null;
    }
}

function escapeValue(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    // Escape single quotes by doubling them
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportTable(tableName) {
    console.log(`Exporting table: ${tableName}...`);

    // Get table schema
    const schemaResult = runQuery(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    if (!schemaResult || !schemaResult[0]?.results?.[0]?.sql) {
        console.log(`  Skipping ${tableName} - table not found`);
        return '';
    }

    let output = `-- Table: ${tableName}\n`;
    output += `DROP TABLE IF EXISTS ${tableName};\n`;
    output += schemaResult[0].results[0].sql + ';\n\n';

    // Get table data
    const dataResult = runQuery(`SELECT * FROM ${tableName}`);
    if (!dataResult || !dataResult[0]?.results?.length) {
        console.log(`  No data in ${tableName}`);
        return output + '\n';
    }

    const rows = dataResult[0].results;
    console.log(`  Found ${rows.length} rows`);

    if (rows.length > 0) {
        const columns = Object.keys(rows[0]);

        for (const row of rows) {
            const values = columns.map(col => escapeValue(row[col])).join(', ');
            output += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
        }
    }

    return output + '\n';
}

async function main() {
    console.log('=== D1 Database Export ===\n');
    console.log(`Database: ${DB_NAME}`);
    console.log(`Output: ${OUTPUT_FILE}\n`);

    let sqlContent = `-- Ralphy Skills Database Export\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += `-- Database: ${DB_NAME}\n\n`;
    sqlContent += `PRAGMA foreign_keys = OFF;\n\n`;

    for (const table of TABLES) {
        const tableSQL = await exportTable(table);
        sqlContent += tableSQL;
    }

    // Export triggers (excluding FTS triggers)
    console.log('\nExporting triggers...');
    const triggersResult = runQuery("SELECT sql FROM sqlite_master WHERE type='trigger' AND sql NOT LIKE '%fts%'");
    if (triggersResult && triggersResult[0]?.results?.length) {
        sqlContent += `-- Triggers\n`;
        for (const trigger of triggersResult[0].results) {
            if (trigger.sql) {
                sqlContent += trigger.sql + ';\n';
            }
        }
    }

    sqlContent += `\nPRAGMA foreign_keys = ON;\n`;

    fs.writeFileSync(OUTPUT_FILE, sqlContent, 'utf8');
    console.log(`\n✅ Export complete: ${OUTPUT_FILE}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
