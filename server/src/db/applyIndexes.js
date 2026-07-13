import 'dotenv/config';
import pkg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function applyIndexes() {
  const sql = readFileSync(join(__dirname, 'indexes.sql'), 'utf8');

  // Split by semicolons, run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const client = await pool.connect();
  let created = 0;
  let skipped = 0;

  try {
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        created++;
        console.log(`  ✓ ${stmt.match(/idx_\w+/)?.[0] || 'index'}`);
      } catch (err) {
        // GIN indexes on free-tier Neon may need extensions — skip gracefully
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          skipped++;
        } else {
          console.warn(`  ⚠ Skipped (${err.message.slice(0, 60)})`);
          skipped++;
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\n✅ Indexes done — ${created} applied, ${skipped} skipped`);
  process.exit(0);
}

applyIndexes().catch(err => {
  console.error('❌ Index creation failed:', err.message);
  process.exit(1);
});
