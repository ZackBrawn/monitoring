import 'dotenv/config'
import pool, { initializeDatabase } from './db.js'
import { seedDemoUsers, validateDemoUsersPassword } from './db/seed-users.js'

try {
  const password = validateDemoUsersPassword()
  await initializeDatabase()
  const users = await seedDemoUsers(password)
  console.log('Akun uji berhasil dibuat (satu password dari DEMO_USERS_PASSWORD):')
  for (const user of users) {
    console.log(`${user.role.padEnd(8)} ${user.email} — ${user.name}`)
  }
} catch (error) {
  console.error('Gagal membuat akun uji:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
