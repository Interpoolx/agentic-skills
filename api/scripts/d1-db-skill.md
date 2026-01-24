# D1 Database Management Guide

## 📋 Table of Contents
- [Configuration](#configuration)
- [Push/Pull Commands](#pushpull-commands)
- [Truncate Commands](#truncate-commands)
- [Backup & Restore](#backup--restore)
- [Important Notes for AI Agents & LLMs](#important-notes-for-ai-agents--llms)
- [Adding New Tables](#adding-new-tables)
- [Troubleshooting](#troubleshooting)

---

## Configuration

The sync script automatically handles table filtering and foreign key constraints. You can customize behavior in `scripts/d1.cjs`:

```javascript
const CONFIG = {
    // Set to true to only sync tables with a specific prefix
    USE_TABLE_PREFIX: false,  // ← Enable filtering if needed
    TABLE_PREFIX: 'db_',      // ← Your prefix (e.g., 'app_', 'prod_')
    
    // Always exclude these patterns (Cloudflare internal & SQLite system tables)
    EXCLUDE_PATTERNS: ['_cf_', 'sqlite_', '_']
};
```

**When to use table prefix filtering:**
- Multi-tenant databases where you want to sync only specific tables
- Development environments with mixed table ownership
- Incremental migrations with versioned table prefixes

**Default behavior (recommended):** Leave `USE_TABLE_PREFIX: false` to sync all user tables.

---

## Push/Pull Commands

### Full Sync (Recommended)
Performs complete synchronization with automatic backup, table drop, schema, and data sync:

```bash
# Pull remote → local
npm run db:pull
# or
node scripts/d1.cjs pull

# Push local → remote
npm run db:push
# or
node scripts/d1.cjs push
```

**What happens:**
1. ✅ Creates backup of destination database
2. 🗑️ Drops all existing tables in destination
3. 📋 Recreates schema (tables, indexes, triggers)
4. 📦 Inserts data in correct dependency order
5. 🧹 Cleans up temporary files

---

### Schema-Only Sync
Useful for initial setup, migrations, or when you only want to update table structure:

```bash
node scripts/d1.cjs pull --schema-only
node scripts/d1.cjs push --schema-only
```

**Use cases:**
- Setting up new environments
- Deploying schema changes without touching data
- Creating database structure templates

---

### Data-Only Sync
Syncs only data, assumes schema is already identical:

```bash
node scripts/d1.cjs pull --data-only
node scripts/d1.cjs push --data-only
```

⚠️ **Warning:** Schema must already match! Use after schema-only sync or when you're certain structures are identical.

---

### Merge Without Drop
Syncs without dropping existing tables (adds/updates only):

```bash
node scripts/d1.cjs pull --no-drop
node scripts/d1.cjs push --no-drop
```

⚠️ **Caution:** Can cause conflicts if schema differs. Use when:
- Adding new tables to existing database
- You're certain source and destination schemas are compatible
- Testing incremental changes

---

### Skip Backup (Not Recommended)
For quick development iterations only:

```bash
node scripts/d1.cjs pull --no-backup
node scripts/d1.cjs push --no-backup
```

❌ **Never use in production!** Always keep backups of production data.

---

### Combined Flags
You can combine multiple flags:

```bash
# Schema-only without backup (quick dev setup)
node scripts/d1.cjs pull --schema-only --no-backup

# Data-only without dropping (careful merge)
node scripts/d1.cjs push --data-only --no-drop

# Schema without backup or drop (additive changes only)
node scripts/d1.cjs push --schema-only --no-drop --no-backup
```

---

## Truncate Commands

Removes all data while preserving schema (tables, indexes, triggers remain intact).

```bash
# Truncate local database (with automatic backup)
npm run db:truncate
# or
node scripts/d1.cjs truncate

# Truncate remote database (with automatic backup)
npm run db:truncate:remote
# or
node scripts/d1.cjs truncate --remote

# Truncate without backup (use with extreme caution!)
node scripts/d1.cjs truncate --no-backup
```

**What it does:**
1. ✅ Creates automatic backup (unless `--no-backup`)
2. 📋 Fetches all table names from database
3. 🗑️ Executes `DELETE FROM` on each table
4. ✅ Preserves all schema elements
5. 🧹 Cleans up temporary files

**Example output:**
```
🗑️  Truncating all tables in local database...
  -> Creating local backup before truncating...
  ✅ local backup saved: api/backups/backup-local-2026-01-23T15-45-30.sql
  -> Fetching table list from local database...
  -> Found 5 table(s) to truncate
     Tables: categories, skills, tools, users, install_events
  -> Truncating 5 table(s)...
  -> Cleaning up temporary files...
✅ Truncate complete! All data removed from local database (schema preserved).
```

---

## Backup & Restore

### Manual Backups

```bash
# Backup local database
node scripts/d1.cjs backup
# Saves to: api/backups/local-[timestamp].sql

# Backup remote database
node scripts/d1.cjs backup --remote
# Saves to: api/backups/remote-[timestamp].sql
```

### Restore from Backup

```bash
# Restore to local database
node scripts/d1.cjs restore api/backups/local-2026-01-23T15-45-30.sql

# Restore to remote database (careful!)
node scripts/d1.cjs restore api/backups/remote-2026-01-23T15-45-30.sql --remote
```

**Backup location:** All backups are stored in `api/backups/`

---

## Important Notes for AI Agents & LLMs

### 🤖 Automatic Foreign Key Handling

The script **automatically manages foreign key constraints** using:

1. **Dependency Analysis:** Parses `CREATE TABLE` statements to detect `FOREIGN KEY` references
2. **Topological Sorting:** Orders tables so parent tables are populated before child tables
3. **Safe Execution:** Disables FK checks during insert, re-enables after completion

**Example dependency chain:**
```
categories (no dependencies)
  ↓
skills (references categories)
  ↓
tools (references skills)
  ↓
install_events (references skills, tools, users)
```

**Insert order:** `categories` → `skills` → `tools` → `users` → `install_events`

### ✅ What Works Automatically

- ✅ Simple foreign keys (`FOREIGN KEY (skill_id) REFERENCES skills(id)`)
- ✅ Multiple foreign keys per table
- ✅ Chains of dependencies (A → B → C → D)
- ✅ Self-referential tables (with proper data ordering)
- ✅ Circular dependencies (handled gracefully, inserts in best-effort order)

### ⚠️ What Requires Attention

When adding new tables, **no special action is required** if:
- Foreign keys are properly declared in `CREATE TABLE` statements
- Referenced tables exist in the same database
- Data can be ordered to satisfy dependencies

**However, be mindful of:**

1. **Circular Dependencies:**
   ```sql
   -- Table A references B, B references A
   CREATE TABLE users (
       id TEXT PRIMARY KEY,
       best_post_id TEXT,
       FOREIGN KEY (best_post_id) REFERENCES posts(id)
   );
   
   CREATE TABLE posts (
       id TEXT PRIMARY KEY,
       author_id TEXT,
       FOREIGN KEY (author_id) REFERENCES users(id)
   );
   ```
   **Solution:** One FK should allow NULL, or use `ON DELETE SET NULL`

2. **Self-Referential Tables:**
   ```sql
   CREATE TABLE categories (
       id TEXT PRIMARY KEY,
       parent_id TEXT,
       FOREIGN KEY (parent_id) REFERENCES categories(id)
   );
   ```
   **Solution:** Insert parent rows before child rows in your application logic

3. **Complex Constraints:**
   - Unique constraints across multiple tables
   - Check constraints that reference other tables
   - Triggers that validate against other tables
   
   **Solution:** These are preserved in schema but may fail during data insert if constraints are violated

---

## Adding New Tables

### ✅ Fully Automatic Process

1. **Create migration or modify schema:**
   ```sql
   CREATE TABLE new_table (
       id TEXT PRIMARY KEY,
       foreign_id TEXT,
       FOREIGN KEY (foreign_id) REFERENCES existing_table(id)
   );
   ```

2. **Run migration locally:**
   ```bash
   npm run db:migrate  # or your migration command
   ```

3. **Push to remote:**
   ```bash
   npm run db:push
   ```

**The script automatically:**
- Detects the new table
- Analyzes its foreign key dependencies
- Inserts data in the correct order
- Handles all constraint checking

### 📝 Best Practices

1. **Always declare foreign keys explicitly:**
   ```sql
   -- ✅ GOOD: Explicit FK declaration
   FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
   
   -- ❌ BAD: Undeclared relationship (script won't detect)
   -- Just having a column named skill_id without FOREIGN KEY
   ```

2. **Use meaningful CASCADE/SET NULL actions:**
   ```sql
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
   ```

3. **Test locally first:**
   ```bash
   # Always test push/pull locally before touching remote
   npm run db:pull   # Test remote → local
   npm run db:push   # Then local → remote
   ```

4. **Keep backups:**
   - Automatic backups are created before every sync
   - Store important backups separately: `cp api/backups/backup-remote-*.sql ~/safe-location/`

5. **Use migrations for schema changes:**
   - Don't manually edit remote database schema
   - Use migration files tracked in version control
   - Apply migrations locally, then push to remote

### 🎯 Table Prefix Strategy

If managing multiple applications in one database:

```javascript
// In d1.cjs CONFIG
const CONFIG = {
    USE_TABLE_PREFIX: true,
    TABLE_PREFIX: 'myapp_',  // Only sync tables starting with 'myapp_'
    EXCLUDE_PATTERNS: ['_cf_', 'sqlite_', '_']
};
```

**Table naming:**
```sql
CREATE TABLE myapp_users (...);      -- ✅ Synced
CREATE TABLE myapp_posts (...);      -- ✅ Synced
CREATE TABLE other_app_data (...);   -- ❌ Ignored
```

---

## Troubleshooting

### Foreign Key Constraint Failed

**Symptoms:**
```
X [ERROR] FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

**Causes:**
1. Data references non-existent records
2. Circular dependencies without NULL-able FKs
3. Incorrect insertion order (shouldn't happen with current script)

**Solutions:**
```bash
# 1. Check your data integrity locally first
npm run db:pull  # Pull remote to local
# Verify data in local database

# 2. If data is corrupt, clean and resync
npm run db:truncate        # Clear local
npm run db:pull            # Fresh pull from remote

# 3. If remote is corrupt
npm run db:truncate:remote # Clear remote (with backup!)
npm run db:push            # Push clean local data
```

### Syntax Errors During Schema Apply

**Symptoms:**
```
X [ERROR] near "CREATE": syntax error at offset 223
```

**Causes:**
1. PRAGMA statements in wrong position
2. Invalid SQL syntax
3. D1-unsupported SQL features

**Solutions:**
1. Check `temp_*_schema.sql` file for malformed SQL
2. Ensure migrations use D1-compatible syntax
3. Report issue if script is generating invalid SQL

### Table Not Syncing

**Symptoms:**
- Table exists locally but not syncing to remote

**Check:**
1. **Table name doesn't start with excluded patterns:**
   ```javascript
   EXCLUDE_PATTERNS: ['_cf_', 'sqlite_', '_']
   // Tables like _internal, sqlite_master are excluded
   ```

2. **Prefix filtering is not blocking it:**
   ```javascript
   // If USE_TABLE_PREFIX is true
   TABLE_PREFIX: 'db_'
   // Only 'db_*' tables sync
   ```

3. **Table is in export:**
   ```bash
   node scripts/d1.cjs export --local --output=test.sql
   # Check if table appears in test.sql
   ```

### Transaction Errors

**Symptoms:**
```
X [ERROR] To execute a transaction, please use state.storage.transaction()
```

**This is fixed in current version.** The script now:
- Removes `BEGIN TRANSACTION` and `COMMIT` statements
- Lets D1 handle transactions internally

If you still see this, update to the latest `d1.cjs` script.

---

## Quick Reference

```bash
# Daily workflow
npm run db:pull              # Sync remote changes to local
# ... make changes locally ...
npm run db:push              # Push local changes to remote

# Reset everything
npm run db:truncate          # Clear local data
npm run db:pull              # Fresh pull from remote

# Backup before major changes
node scripts/d1.cjs backup --remote

# Recovery
node scripts/d1.cjs restore api/backups/backup-remote-[timestamp].sql --remote
```

---

## Summary for AI Agents

**When suggesting database operations:**

1. ✅ **Push/Pull is smart:** It handles foreign keys automatically
2. ✅ **Always backup:** Don't suggest `--no-backup` for production
3. ✅ **Order matters:** Script handles it, but recommend testing locally first
4. ✅ **Migrations preferred:** Suggest migration files over manual schema edits
5. ⚠️ **Circular FKs:** Flag these for manual review
6. ⚠️ **Production changes:** Always recommend backup + local test first

**Key commands to remember:**
- `npm run db:pull` - Safe, creates backup, full sync
- `npm run db:push` - Backup + full sync to remote
- `node scripts/d1.cjs backup --remote` - Manual backup
- `npm run db:truncate` - Clear data, keep schema

**The script is designed to "just work" for standard database schemas with proper foreign key declarations.**