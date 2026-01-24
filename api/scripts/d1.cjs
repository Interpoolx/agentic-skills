const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Resolve path to wrangler.toml
// If script is at api/scripts/d1.js, wrangler.toml is at api/wrangler.toml
const wranglerPath = path.join(__dirname, '../wrangler.toml');

if (!fs.existsSync(wranglerPath)) {
    console.error(`❌ Error: wrangler.toml not found at ${wranglerPath}`);
    process.exit(1);
}

// 2. Parse wrangler.toml for database_name
const content = fs.readFileSync(wranglerPath, 'utf-8');
const dbNameMatch = content.match(/database_name\s*=\s*"([^"]+)"/);

if (!dbNameMatch) {
    console.error('❌ Error: Could not find database_name in wrangler.toml');
    process.exit(1);
}

const dbName = dbNameMatch[1];
const commandArgs = process.argv.slice(2);

// Configuration: Table prefix filtering
const CONFIG = {
    // Set to true to only sync tables with this prefix (e.g., 'db_')
    USE_TABLE_PREFIX: false,
    TABLE_PREFIX: 'db_',
    
    // Always exclude these patterns (Cloudflare internal & SQLite system tables)
    EXCLUDE_PATTERNS: ['_cf_', 'sqlite_', '_']
};

// Construct the command base
let finalArgs = ['d1'];

// Handle custom "backup" and "restore" subcommands to simplify package.json
const firstArg = commandArgs[0];

if (firstArg === 'backup') {
    const isRemote = commandArgs.includes('--remote');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const type = isRemote ? 'remote' : 'local';
    const outputDir = path.join(__dirname, '../api/backups');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = `api/backups/${type}-${timestamp}.sql`;
    const flag = isRemote ? '--remote' : '--local';

    console.log(`📦 Triggering ${type} backup to: ${outputPath}`);
    const cmd = `npx wrangler d1 -c ${wranglerPath} export ${dbName} ${flag} --output=${outputPath}`;
    runCommand(cmd);
    console.log(`✅ Backup saved to: ${outputPath}`);
    process.exit(0);
}

if (firstArg === 'restore') {
    const isRemote = commandArgs.includes('--remote');
    const filePath = commandArgs.find(arg => arg.endsWith('.sql'));

    if (!filePath) {
        console.error('❌ Error: Please specify a .sql file to restore.');
        process.exit(1);
    }

    const flag = isRemote ? '--remote' : '--local';
    console.log(`🔄 Restoring ${filePath} to ${isRemote ? 'remote' : 'local'} database...`);
    const cmd = `npx wrangler d1 -c ${wranglerPath} execute ${dbName} ${flag} --file=${filePath}`;
    runCommand(cmd);
    process.exit(0);
}

if (firstArg === 'truncate') {
    const isRemote = commandArgs.includes('--remote');
    const flag = isRemote ? '--remote' : '--local';
    const type = isRemote ? 'remote' : 'local';
    const noBackup = commandArgs.includes('--no-backup');
    
    console.log(`🗑️  Truncating all tables in ${type} database...`);
    
    // Step 0: Backup before truncating (unless --no-backup)
    if (!noBackup) {
        console.log(`  -> Creating ${type} backup before truncating...`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupDir = path.join(__dirname, '../api/backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = `api/backups/backup-${type}-${timestamp}.sql`;
        const backupCmd = `npx wrangler d1 -c ${wranglerPath} export ${dbName} ${flag} --output=${backupPath}`;
        runCommand(backupCmd);
        console.log(`  ✅ ${type} backup saved: ${backupPath}`);
    } else {
        console.log(`  ⚠️  Skipping backup (--no-backup flag set)`);
    }
    
    // Step 1: Export to get table list
    console.log(`  -> Fetching table list from ${type} database...`);
    const exportCmd = `npx wrangler d1 -c ${wranglerPath} export ${dbName} ${flag} --output=temp_truncate_export.sql`;
    runCommand(exportCmd);
    
    // Step 2: Parse SQL to get table names
    const sql = fs.readFileSync('temp_truncate_export.sql', 'utf8');
    const { tables } = splitSchemaAndData(sql);
    
    if (tables.length === 0) {
        console.log('  ℹ️  No tables found to truncate.');
        try { fs.unlinkSync('temp_truncate_export.sql'); } catch (e) { }
        process.exit(0);
    }
    
    console.log(`  -> Found ${tables.length} table(s) to truncate`);
    if (CONFIG.USE_TABLE_PREFIX) {
        console.log(`     (only tables with prefix: ${CONFIG.TABLE_PREFIX})`);
    }
    console.log(`     Tables: ${tables.join(', ')}`);
    
    // Step 3: Generate DELETE statements (safer than TRUNCATE for D1)
    const deleteStatements = tables.map(t => `DELETE FROM "${t}";`).join('\n');
    fs.writeFileSync('temp_truncate.sql', deleteStatements);
    
    // Step 4: Execute DELETE statements
    console.log(`  -> Truncating ${tables.length} table(s)...`);
    const truncateCmd = `npx wrangler d1 -c ${wranglerPath} execute ${dbName} ${flag} --file=temp_truncate.sql`;
    runCommand(truncateCmd);
    
    // Step 5: Cleanup
    console.log('  -> Cleaning up temporary files...');
    try { fs.unlinkSync('temp_truncate_export.sql'); } catch (e) { }
    try { fs.unlinkSync('temp_truncate.sql'); } catch (e) { }
    
    console.log(`✅ Truncate complete! All data removed from ${type} database (schema preserved).`);
    process.exit(0);
}

if (firstArg === 'pull' || firstArg === 'push') {
    const isPush = firstArg === 'push';
    const direction = isPush ? 'local → remote' : 'remote → local';
    const sourceFlag = isPush ? '--local' : '--remote';
    const destFlag = isPush ? '--remote' : '--local';
    const sourceType = isPush ? 'local' : 'remote';
    const destType = isPush ? 'remote' : 'local';
    
    // Parse flags
    const schemaOnly = commandArgs.includes('--schema-only');
    const dataOnly = commandArgs.includes('--data-only');
    const noDrop = commandArgs.includes('--no-drop');
    const noBackup = commandArgs.includes('--no-backup');
    
    if (schemaOnly && dataOnly) {
        console.error('❌ Error: Cannot use both --schema-only and --data-only');
        process.exit(1);
    }

    console.log(`${isPush ? '📤' : '📥'} ${isPush ? 'Pushing' : 'Pulling'} ${direction}...`);
    
    // Step 0: Backup destination database first (unless --no-backup)
    if (!noBackup) {
        console.log(`  -> Creating ${destType} backup before sync...`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupDir = path.join(__dirname, '../api/backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const backupPath = `api/backups/backup-${destType}-${timestamp}.sql`;
        const backupCmd = `npx wrangler d1 -c ${wranglerPath} export ${dbName} ${destFlag} --output=${backupPath}`;
        runCommand(backupCmd);
        console.log(`  ✅ ${destType} backup saved: ${backupPath}`);
    } else {
        console.log(`  ⚠️  Skipping backup (--no-backup flag set)`);
    }

    const schemaFile = `temp_${sourceType}_schema.sql`;
    const dataFile = `temp_${sourceType}_data.sql`;

    // 1. Export source database
    console.log(`  -> Exporting ${sourceType} database...`);
    const exportCmd = `npx wrangler d1 -c ${wranglerPath} export ${dbName} ${sourceFlag} --output=temp_${sourceType}_full.sql`;
    runCommand(exportCmd);

    // 2. Split SQL into schema and data
    console.log('  -> Separating schema and data...');
    const sql = fs.readFileSync(`temp_${sourceType}_full.sql`, 'utf8');
    const { schema, data, tables } = splitSchemaAndData(sql);

    // 3. Drop existing tables (unless --no-drop or --data-only)
    if (!noDrop && !dataOnly) {
        console.log(`  -> Dropping ${destType} tables...`);
        if (CONFIG.USE_TABLE_PREFIX) {
            console.log(`     (only tables with prefix: ${CONFIG.TABLE_PREFIX})`);
        }
        const dropStatements = tables.map(t => `DROP TABLE IF EXISTS "${t}";`).join('\n');
        fs.writeFileSync('temp_drop_tables.sql', dropStatements);
        const dropCmd = `npx wrangler d1 -c ${wranglerPath} execute ${dbName} ${destFlag} --file=temp_drop_tables.sql`;
        runCommand(dropCmd);
    } else if (noDrop) {
        console.log('  ⚠️  Skipping table drops (--no-drop flag set)');
    }

    // 4. Apply schema (unless --data-only)
    if (!dataOnly) {
        console.log(`  -> Applying ${sourceType} schema to ${destType}...`);
        fs.writeFileSync(schemaFile, schema);
        const schemaCmd = `npx wrangler d1 -c ${wranglerPath} execute ${dbName} ${destFlag} --file=${schemaFile}`;
        runCommand(schemaCmd);
    } else {
        console.log('  ⚠️  Skipping schema (--data-only flag set)');
    }

    // 5. Apply data (unless --schema-only)
    if (!schemaOnly) {
        console.log(`  -> Applying ${sourceType} data to ${destType}...`);
        fs.writeFileSync(dataFile, data);
        const dataCmd = `npx wrangler d1 -c ${wranglerPath} execute ${dbName} ${destFlag} --file=${dataFile}`;
        runCommand(dataCmd);
    } else {
        console.log('  ⚠️  Skipping data (--schema-only flag set)');
    }

    // 6. Cleanup
    console.log('  -> Cleaning up temporary files...');
    [`temp_${sourceType}_full.sql`, 'temp_drop_tables.sql', schemaFile, dataFile].forEach(file => {
        try { fs.unlinkSync(file); } catch (e) { }
    });

    console.log(`✅ ${isPush ? 'Push' : 'Pull'} complete! ${sourceType} data synced to ${destType}.`);
    process.exit(0);
}

// 3. Regular D1 Command Proxy logic
const subcommands = {
    'migrations': ['list', 'apply'],
    'execute': [],
    'info': [],
    'export': []
};

// Add config path if not provided
if (!commandArgs.includes('-c') && !commandArgs.includes('--config')) {
    finalArgs.push('-c', wranglerPath);
}

let injectPos = -1;
for (let i = 0; i < commandArgs.length; i++) {
    const arg = commandArgs[i];
    if (subcommands[arg]) {
        if (subcommands[arg].length > 0 && subcommands[arg].includes(commandArgs[i + 1])) {
            injectPos = i + 2;
        } else {
            injectPos = i + 1;
        }
        break;
    }
}

let finalCommandArgs;
if (injectPos !== -1) {
    const argsBefore = commandArgs.slice(0, injectPos);
    const argsAfter = commandArgs.slice(injectPos);
    finalCommandArgs = [...argsBefore, dbName, ...argsAfter];
} else {
    // If no D1 subcommand found, just append the dbName at the end (fallback)
    finalCommandArgs = [...commandArgs, dbName];
}

const cmd = `npx wrangler ${finalArgs.join(' ')} ${finalCommandArgs.join(' ')}`;
runCommand(cmd);

function runCommand(cmd) {
    console.log(`🚀 Running: ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.error(`❌ Command failed with exit code ${e.status || 1}`);
        process.exit(e.status || 1);
    }
}

function splitSchemaAndData(sql) {
    const lines = sql.split('\n');
    const schemaLines = [];
    const insertsByTable = {};
    const tables = new Set();
    const pragmaLines = [];
    const tableDependencies = {};
    
    let inCreateStatement = false;
    let currentCreateTable = null;
    let currentTableDefinition = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip transaction control statements (D1 doesn't support them)
        if (trimmed === 'BEGIN TRANSACTION;' || trimmed === 'COMMIT;') {
            continue;
        }
        
        // Collect PRAGMA statements separately
        if (trimmed.startsWith('PRAGMA')) {
            pragmaLines.push(line);
            continue;
        }
        
        // Track when we enter a CREATE TABLE statement
        const createTableMatch = trimmed.match(/CREATE TABLE (?:IF NOT EXISTS )?[`"']?(\w+)[`"']?/i);
        if (createTableMatch) {
            const tableName = createTableMatch[1];
            currentCreateTable = tableName;
            currentTableDefinition = [line];
            
            if (shouldIncludeTable(tableName)) {
                tables.add(tableName);
                inCreateStatement = true;
                tableDependencies[tableName] = [];
            } else {
                inCreateStatement = false;
            }
            continue;
        }
        
        // Collect CREATE TABLE lines to analyze foreign keys
        if (inCreateStatement) {
            currentTableDefinition.push(line);
            
            // Check for FOREIGN KEY references
            const fkMatch = trimmed.match(/FOREIGN KEY.*REFERENCES\s+[`"']?(\w+)[`"']?/i);
            if (fkMatch && currentCreateTable) {
                const referencedTable = fkMatch[1];
                if (shouldIncludeTable(referencedTable)) {
                    tableDependencies[currentCreateTable].push(referencedTable);
                }
            }
        }
        
        // Track when we exit a CREATE TABLE statement
        if (inCreateStatement && trimmed.endsWith(');')) {
            schemaLines.push(...currentTableDefinition);
            inCreateStatement = false;
            currentCreateTable = null;
            currentTableDefinition = [];
            continue;
        }
        
        // Skip lines from excluded tables
        if (currentCreateTable && !shouldIncludeTable(currentCreateTable)) {
            if (trimmed.endsWith(');')) {
                currentCreateTable = null;
                currentTableDefinition = [];
            }
            continue;
        }
        
        // Skip internal table statements
        if (isInternalTableStatement(trimmed)) {
            continue;
        }
        
        // Determine if this is schema or data
        const isSchemaLine = (
            trimmed.startsWith('CREATE INDEX') ||
            trimmed.startsWith('CREATE UNIQUE INDEX') ||
            trimmed.startsWith('CREATE TRIGGER') ||
            trimmed.startsWith('CREATE VIEW') ||
            trimmed.startsWith('--') ||
            (trimmed === '' && !inCreateStatement)
        );
        
        const isDataLine = trimmed.startsWith('INSERT INTO');
        
        if (isSchemaLine) {
            schemaLines.push(line);
        } else if (isDataLine) {
            // Check if this INSERT is for an excluded table
            const insertTableMatch = trimmed.match(/INSERT INTO\s+[`"']?(\w+)[`"']?/i);
            if (insertTableMatch) {
                const tableName = insertTableMatch[1];
                if (!shouldIncludeTable(tableName)) {
                    continue;
                }
                
                // Group inserts by table
                if (!insertsByTable[tableName]) {
                    insertsByTable[tableName] = [];
                }
                insertsByTable[tableName].push(line);
            }
        }
    }
    
    // Build schema with proper structure
    let schemaText = '';
    
    // Add PRAGMAs at the beginning
    if (pragmaLines.length > 0) {
        schemaText = pragmaLines.join('\n') + '\n\n';
    }
    
    // Add schema statements
    schemaText += schemaLines.join('\n').trim();
    
    // Remove duplicate empty lines
    schemaText = schemaText.replace(/\n\n+/g, '\n\n');
    
    // Build data with proper ordering based on foreign key dependencies
    let dataText = '';
    
    // Disable foreign key checks temporarily
    dataText = 'PRAGMA foreign_keys=OFF;\n\n';
    
    // Sort tables topologically (tables with no dependencies first)
    const sortedTables = topologicalSort(Array.from(tables), tableDependencies);
    
    // Add inserts in dependency order
    for (const tableName of sortedTables) {
        if (insertsByTable[tableName] && insertsByTable[tableName].length > 0) {
            dataText += `-- Inserts for ${tableName}\n`;
            dataText += insertsByTable[tableName].join('\n') + '\n\n';
        }
    }
    
    // Re-enable foreign key checks
    dataText += 'PRAGMA foreign_keys=ON;\n';
    
    return {
        schema: schemaText,
        data: dataText,
        tables: Array.from(tables)
    };
}

function topologicalSort(tables, dependencies) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    function visit(table) {
        if (visited.has(table)) return;
        if (visiting.has(table)) {
            // Circular dependency detected, just continue
            return;
        }
        
        visiting.add(table);
        
        const deps = dependencies[table] || [];
        for (const dep of deps) {
            if (tables.includes(dep)) {
                visit(dep);
            }
        }
        
        visiting.delete(table);
        visited.add(table);
        sorted.push(table);
    }
    
    for (const table of tables) {
        visit(table);
    }
    
    return sorted;
}

function topologicalSort(tables, dependencies) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    function visit(table) {
        if (visited.has(table)) return;
        if (visiting.has(table)) {
            // Circular dependency detected, just continue
            return;
        }
        
        visiting.add(table);
        
        const deps = dependencies[table] || [];
        for (const dep of deps) {
            if (tables.includes(dep)) {
                visit(dep);
            }
        }
        
        visiting.delete(table);
        visited.add(table);
        sorted.push(table);
    }
    
    for (const table of tables) {
        visit(table);
    }
    
    return sorted;
}

function shouldIncludeTable(tableName) {
    // Always exclude Cloudflare internal and SQLite system tables
    for (const pattern of CONFIG.EXCLUDE_PATTERNS) {
        if (tableName.startsWith(pattern)) {
            return false;
        }
    }
    
    // If prefix filtering is enabled, only include tables with the prefix
    if (CONFIG.USE_TABLE_PREFIX) {
        return tableName.startsWith(CONFIG.TABLE_PREFIX);
    }
    
    return true;
}

function isInternalTableStatement(trimmed) {
    // Check for internal table patterns in CREATE or INSERT statements
    const hasInternalPattern = (
        trimmed.includes('_cf_') || 
        trimmed.includes('"_') || 
        trimmed.includes("'_") ||
        trimmed.includes('`_') ||
        trimmed.match(/CREATE (?:TABLE|INDEX).*sqlite_/i)
    );
    
    return hasInternalPattern;
}