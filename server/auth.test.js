import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessProduction } from './auth.js'
import { validateDemoUsersPassword } from './db/seed-users.js'
import { hashPassword, verifyPassword } from './passwords.js'

test('passwords are hashed and verified without accepting a different password', async () => {
  const hash = await hashPassword('testing-password-123')
  assert.notEqual(hash, 'testing-password-123')
  assert.equal(await verifyPassword('testing-password-123', hash), true)
  assert.equal(await verifyPassword('wrong-password', hash), false)
  assert.equal(await verifyPassword('testing-password-123', 'invalid'), false)
})

test('demo account seeding refuses production and weak passwords', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalPassword = process.env.DEMO_USERS_PASSWORD
  try {
    process.env.NODE_ENV = 'production'
    assert.throws(() => validateDemoUsersPassword('long-enough-demo-password'), /production/)
    process.env.NODE_ENV = 'test'
    assert.throws(() => validateDemoUsersPassword('short'), /minimal 12 karakter/)
    assert.equal(validateDemoUsersPassword('long-enough-demo-password'), 'long-enough-demo-password')
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalPassword === undefined) delete process.env.DEMO_USERS_PASSWORD
    else process.env.DEMO_USERS_PASSWORD = originalPassword
  }
})

test('production records are scoped to their assigned producer and NLE', () => {
  const production = { producer: 'Andi Saputra', editor: 'Rizky Maulana' }

  assert.equal(canAccessProduction({ role: 'producer', name: 'Andi Saputra' }, production), true)
  assert.equal(canAccessProduction({ role: 'producer', name: 'Maya Putri' }, production), false)
  assert.equal(canAccessProduction({ role: 'nle', name: 'Rizky Maulana' }, production), true)
  assert.equal(canAccessProduction({ role: 'nle', name: 'Siti Rahma' }, production), false)
  assert.equal(canAccessProduction({ role: 'pic', name: 'Dina Pratama' }, production), true)
  assert.equal(canAccessProduction({ role: 'admin', name: 'Admin Monitoring' }, production), true)
})
