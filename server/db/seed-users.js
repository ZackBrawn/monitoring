import pool from '../db.js'
import { hashPassword } from '../passwords.js'

const demoUsers = [
  { name: 'Dina Pratama', email: 'pic@monitoring.local', role: 'pic' },
  { name: 'Andi Saputra', email: 'produser@monitoring.local', role: 'producer' },
  { name: 'Rizky Maulana', email: 'nle@monitoring.local', role: 'nle' },
  { name: 'Admin Monitoring', email: 'admin@monitoring.local', role: 'admin' },
]

export function validateDemoUsersPassword(password = process.env.DEMO_USERS_PASSWORD) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Akun demo tidak boleh dibuat di production.')
  }
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Atur DEMO_USERS_PASSWORD (minimal 12 karakter) di .env sebelum membuat akun demo.')
  }
  return password
}

export async function seedDemoUsers(password) {
  const validPassword = validateDemoUsersPassword(password)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const user of demoUsers) {
      const passwordHash = await hashPassword(validPassword)
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             is_active = TRUE`,
        [user.name, user.email, passwordHash, user.role],
      )
    }
    await client.query('COMMIT')
    return demoUsers.map(({ name, email, role }) => ({ name, email, role }))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
