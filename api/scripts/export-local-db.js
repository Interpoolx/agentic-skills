#!/usr/bin/env node
/**
 * Export Local D1 Database to SQL file
 * Uses sqlite3 directly to access the local miniflare database
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DB_PATH = path.join(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject', 'ce422b47f69326671218e63a68948e43e74a062eaa88e08c04ab5eb64041d242.sqlite');
const OUTPUT_FILE = path.join(__dirname, '..', 'db_local_export.sql');

function runSqlite(sql) {
    try {
        const result = execSync(
            `sqlite3 "${LOCAL_DB_PATH}" "${sql.replace(/"/g, '\\"')}"`,
            { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
        );
        return result.trim();
    } catch (error) {
        console.error(`Error running query: ${sql}`);
        console.error(error.message);
        return null;
    }
}

function escapeValue(value) {
    if (value === null || value === undefined || value === '') return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    // Escape single quotes by doubling them
    return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
    console.log('=== Local D1 Database Export ===\n');
    console.log(`Database: ${LOCAL_DB_PATH}`);
    console.log(`Output: ${OUTPUT_FILE}\n`);

    // Check if database exists
    if (!fs.existsSync(LOCAL_DB_PATH)) {
        console.error(`❌ Database not found at: ${LOCAL_DB_PATH}`);
        process.exit(1);
    }

    let sqlContent = `-- Ralphy Skills Local Database Export\n`;
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
    sqlContent += `-- Source: Local D1 (miniflare)\n\n`;
    sqlContent += `PRAGMA foreign_keys = OFF;\n\n`;

    // Get all tables (excluding FTS and internal tables)
    console.log('Discovering tables...');
    const tablesRaw = runSqlite("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts' AND name NOT LIKE '%_config' AND name NOT LIKE '%_data' AND name NOT LIKE '%_idx' AND name NOT LIKE '%_content' AND name NOT LIKE '%_docsize' ORDER BY name;");

    if (!tablesRaw) {
        console.error('❌ Failed to get tables');
        process.exit(1);
    }

    const tables = tablesRaw.split('\n').filter(t => t.trim() && !t.includes('_fts'));
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}\n`);

    for (const tableName of tables) {
        console.log(`Exporting table: ${tableName}...`);

        // Get table schema
        const schema = runSqlite(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        if (!schema) {
            console.log(`  Skipping ${tableName} - no schema found`);
            continue;
        }

        sqlContent += `-- Table: ${tableName}\n`;
        sqlContent += `DROP TABLE IF EXISTS ${tableName};\n`;
        sqlContent += schema + ';\n\n';

        // Get row count
        const countResult = runSqlite(`SELECT COUNT(*) FROM ${tableName}`);
        const rowCount = parseInt(countResult) || 0;
        console.log(`  Found ${rowCount} rows`);

        if (rowCount > 0) {
            // Get column names
            const pragmaResult = runSqlite(`PRAGMA table_info(${tableName})`);
            const columns = pragmaResult.split('\n').map(line => line.split('|')[1]).filter(Boolean);

            // Get all data in CSV format
            const data = runSqlite(`.mode csv\nSELECT * FROM ${tableName}`);
            if (data) {
                const rows = data.split('\n').filter(r => r.trim());
                for (const row of rows) {
                    // Parse CSV row (simple parser for now)
                    const values = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];
                        if (char === '"') {
                            if (inQuotes && row[i + 1] === '"') {
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            values.push(current);
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current);

                    const escapedValues = values.map(v => {
                        if (v === '' || v === 'NULL') return 'NULL';
                        return escapeValue(v);
                    }).join(', ');

                    sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${escapedValues});\n`;
                }
            }
        }

        sqlContent += '\n';
    }

    // Export triggers (excluding FTS triggers)
    console.log('\nExporting triggers...');
    const triggersRaw = runSqlite("SELECT sql FROM sqlite_master WHERE type='trigger' AND sql NOT LIKE '%fts%'");
    if (triggersRaw) {
        const triggers = triggersRaw.split('\n').filter(t => t.trim());
        if (triggers.length > 0) {
            sqlContent += `-- Triggers\n`;
            for (const trigger of triggers) {
                if (trigger.trim()) {
                    sqlContent += trigger + ';\n';
                }
            }
        }
    }

    // Export indexes
    console.log('Exporting indexes...');
    const indexesRaw = runSqlite("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'");
    if (indexesRaw) {
        const indexes = indexesRaw.split('\n').filter(i => i.trim());
        if (indexes.length > 0) {
            sqlContent += `\n-- Indexes\n`;
            for (const index of indexes) {
                if (index.trim()) {
                    sqlContent += index + ';\n';
                }
            }
        }
    }

    sqlContent += `\nPRAGMA foreign_keys = ON;\n`;

    fs.writeFileSync(OUTPUT_FILE, sqlContent, 'utf8');
    console.log(`\n✅ Export complete: ${OUTPUT_FILE}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
