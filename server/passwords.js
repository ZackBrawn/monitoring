import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const keyLength = 64

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, keyLength)
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, storedKey] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !/^[a-f\d]{128}$/i.test(storedKey)) return false

  const expectedKey = Buffer.from(storedKey, 'hex')
  const actualKey = await scrypt(password, salt, expectedKey.length)
  return actualKey.length === expectedKey.length && timingSafeEqual(actualKey, expectedKey)
}
