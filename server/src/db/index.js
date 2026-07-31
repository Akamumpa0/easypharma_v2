import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Prevent Node server crashes when Neon terminates idle database connections
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client (Neon disconnect):', err.message);
});

export const db = drizzle(pool, { schema });
