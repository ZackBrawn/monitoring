import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {},
)

const schemaUrl = new URL('./db/schema.sql', import.meta.url)

export async function initializeDatabase() {
  const schema = await readFile(fileURLToPath(schemaUrl), 'utf8')
  await pool.query(schema)
}

export default pool
