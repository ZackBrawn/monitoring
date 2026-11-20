import 'dotenv/config'
import pool, { initializeDatabase } from './db.js'
import { seedDatabase } from './db/seed.js'

try {
  await initializeDatabase()
  const result = await seedDatabase()
  console.log(
    `Seeder selesai. Produksi baru: ${result.productionsInserted}; notifikasi baru: ${result.notificationsInserted}.`,
  )
} catch (error) {
  console.error('Seeder database gagal:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
