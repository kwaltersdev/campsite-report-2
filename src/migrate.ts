import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { query } from './db.js';

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map(row => row.filename));
}

async function applyMigration(filename: string) {
  const filePath = path.join('migrations', filename);
  const sql = await readFile(filePath, 'utf-8');
  await query(sql);
  await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
  console.log(`Applied migration: ${filename}`);
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await readdir('migrations');
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
  for (const file of sqlFiles) {
    if (!applied.has(file)) {
      await applyMigration(file);
    }
  }
  console.log('Migrations complete');
}

runMigrations().catch(console.error);