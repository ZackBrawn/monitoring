import pool from './db.js'

export async function requireAuth(req, res, next) {
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' })

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = TRUE',
      [userId],
    )
    if (!rows[0]) {
      return req.session.destroy((error) => {
        if (error) return next(error)
        res.status(401).json({ error: 'Akun tidak aktif atau sesi sudah berakhir.' })
      })
    }
    req.user = rows[0]
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin.' })
    }
    next()
  }
}

export function canAccessProduction(user, production) {
  if (user.role === 'admin' || user.role === 'pic') return true
  if (user.role === 'producer') return production.producer === user.name
  if (user.role === 'nle') return production.editor === user.name
  return false
}
