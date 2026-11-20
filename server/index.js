import 'dotenv/config'
import compression from 'compression'
import express from 'express'
import multer from 'multer'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { rateLimit } from 'express-rate-limit'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pool, { initializeDatabase } from './db.js'
import { canAccessProduction, requireAuth, requireRole } from './auth.js'
import { hashPassword, verifyPassword } from './passwords.js'
import { seedDatabase } from './db/seed.js'

const app = express()
const port = Number(process.env.PORT || 3000)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
const uploadDir = path.resolve(rootDir, process.env.UPLOAD_DIR || 'server/uploads')
const maxUploadSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB || 2048)
if (!Number.isSafeInteger(maxUploadSizeMb) || maxUploadSizeMb < 1) {
  throw new Error('UPLOAD_MAX_SIZE_MB harus berupa bilangan bulat positif.')
}
const maxUploadSize = maxUploadSizeMb * 1024 * 1024
const sessionSecret = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === 'production'
    ? ''
    : randomBytes(32).toString('hex')
)
if (!sessionSecret) throw new Error('SESSION_SECRET wajib diatur di environment production.')
const allowedExtensions = new Set(['.mp4', '.mov', '.mxf', '.wav', '.mp3', '.aif', '.aiff', '.flac'])
const validStatuses = new Set([
  'Terjadwal',
  'Proses editing',
  'Kendala produksi',
  'Kendala editing',
  'Sudah selesai editing',
  'Produksi selesai',
])
const productionColumns = `
  id, title, show_name AS "show", producer, editor, pic,
  production_date::text AS "productionDate", air_date::text AS "airDate",
  status, issue, production_report AS "productionReport",
  production_completed_at::text AS "productionCompletedAt",
  editing_report AS "editingReport",
  editing_completed_at::text AS "editingCompletedAt",
  submitted_at AS "submittedAt", uploaded_file_name AS "uploadedFileName",
  uploaded_file_size AS "uploadedFileSize", uploaded_mime_type AS "uploadedMimeType",
  created_at AS "createdAt", updated_at AS "updatedAt"`
const fileUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname.replace(/\\/g, '/')).toLowerCase()
      callback(null, `${randomUUID()}${extension}`)
    },
  }),
  limits: { fileSize: maxUploadSize, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname.replace(/\\/g, '/')).toLowerCase()
    if (!allowedExtensions.has(extension)) {
      const error = new Error('Format file tidak didukung. Gunakan MP4, MOV, MXF, WAV, MP3, AIFF, atau FLAC.')
      error.status = 400
      callback(error)
      return
    }
    callback(null, true)
  },
})

const PgSessionStore = connectPgSimple(session)
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false)
app.use(session({
  name: 'monitoring.sid',
  store: new PgSessionStore({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  },
}))
app.use(express.json({ limit: '1mb' }))
app.use(compression())

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' },
})
const demoAccountEmails = {
  pic: 'pic@monitoring.local',
  producer: 'produser@monitoring.local',
  nle: 'nle@monitoring.local',
  admin: 'admin@monitoring.local',
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = $1 AND is_active = TRUE',
      [email],
    )
    const user = rows[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email atau password salah.' })
    }

    await establishSession(req, user)
    res.json(publicUser(user))
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/demo-login', loginLimiter, async (req, res, next) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_LOGIN !== 'true') {
    return res.status(403).json({
      error: 'Login cepat nonaktif. Aktifkan ENABLE_DEMO_LOGIN=true.',
    })
  }
  const { role } = req.body ?? {}
  const email = Object.hasOwn(demoAccountEmails, role) ? demoAccountEmails[role] : null
  if (!email) return res.status(400).json({ error: 'Role akun demo tidak valid.' })

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1 AND role = $2 AND is_active = TRUE',
      [email, role],
    )
    const user = rows[0]
    if (!user) {
      return res.status(404).json({ error: 'Akun demo belum tersedia. Jalankan npm run db:seed-users terlebih dahulu.' })
    }
    await establishSession(req, user)
    res.json(publicUser(user))
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.user)
})

app.post('/api/auth/logout', (req, res, next) => {
  if (!req.session) return res.json({ success: true })
  req.session.destroy((error) => {
    if (error) return next(error)
    res.clearCookie('monitoring.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    res.json({ success: true })
  })
})

app.get('/api/users', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, is_active AS "isActive", created_at AS "createdAt"
       FROM users
       ORDER BY created_at DESC, name`,
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const role = req.body?.role

  if (!name || name.length > 100) {
    return res.status(400).json({ error: 'Nama wajib diisi dan maksimal 100 karakter.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Alamat email tidak valid.' })
  }
  if (password.length < 12 || password.length > 128) {
    return res.status(400).json({ error: 'Password harus terdiri dari 12 hingga 128 karakter.' })
  }
  if (!['pic', 'producer', 'nle', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role pengguna tidak valid.' })
  }

  try {
    const passwordHash = await hashPassword(password)
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
      [name, email, passwordHash, role],
    )
    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email atau nama untuk role tersebut sudah digunakan.' })
    }
    next(error)
  }
})

app.patch('/api/users/:id/role', requireAuth, requireRole('admin'), async (req, res, next) => {
  const { role } = req.body ?? {}
  if (!['pic', 'producer', 'nle', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role pengguna tidak valid.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'SELECT id, name, role FROM users WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [req.params.id],
    )
    const user = rows[0]
    if (!user) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Pengguna tidak ditemukan atau sudah nonaktif.' })
    }
    if (String(user.id) === String(req.user.id) && role !== 'admin') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Role Admin pada akun yang sedang digunakan tidak dapat diturunkan.' })
    }
    if (user.role === 'producer' && !['producer', 'admin'].includes(role)) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM productions WHERE producer = $1 LIMIT 1',
        [user.name],
      )
      if (rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'Role tidak dapat diganti karena pengguna masih tercatat sebagai Produser pada produksi.' })
      }
    }
    if (user.role === 'nle' && !['nle', 'admin'].includes(role)) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM productions WHERE editor = $1 LIMIT 1',
        [user.name],
      )
      if (rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'Role tidak dapat diganti karena pengguna masih tercatat sebagai NLE pada produksi.' })
      }
    }
    if (role === 'producer' && user.role !== 'producer') {
      const { rowCount } = await client.query(
        'SELECT 1 FROM productions WHERE editor = $1 LIMIT 1',
        [user.name],
      )
      if (rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'Role Produser tidak dapat diberikan karena nama pengguna masih tercatat sebagai NLE pada produksi.' })
      }
    }
    if (role === 'nle' && user.role !== 'nle') {
      const { rowCount } = await client.query(
        'SELECT 1 FROM productions WHERE producer = $1 LIMIT 1',
        [user.name],
      )
      if (rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'Role NLE tidak dapat diberikan karena nama pengguna masih tercatat sebagai Produser pada produksi.' })
      }
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE users SET role = $2
       WHERE id = $1
       RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
      [user.id, role],
    )
    await client.query('COMMIT')
    res.json(updatedRows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Pengguna lain dengan nama tersebut sudah memiliki role ini.' })
    }
    next(error)
  } finally {
    client.release()
  }
})

app.get('/api/assignees', requireAuth, requireRole('pic', 'producer', 'admin'), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, role FROM users
       WHERE is_active = TRUE AND role IN ('producer', 'nle')
       ORDER BY role, name`,
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.get('/api/productions', requireAuth, async (req, res, next) => {
  try {
    const scope = req.user.role === 'producer'
      ? { clause: 'WHERE producer = $1', value: req.user.name }
      : req.user.role === 'nle'
        ? { clause: 'WHERE editor = $1', value: req.user.name }
        : { clause: '', value: null }
    const { rows } = await pool.query(
      `SELECT ${productionColumns}
       FROM productions
       ${scope.clause}
       ORDER BY production_date DESC, id`,
      scope.value ? [scope.value] : [],
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.post('/api/productions', requireAuth, requireRole('pic', 'admin'), async (req, res, next) => {
  const { title, show, producer, productionDate, airDate } = req.body ?? {}
  if (![title, show, producer, productionDate, airDate].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'Judul, acara, produser, dan kedua tanggal wajib diisi.' })
  }
  if (!isValidDate(productionDate) || !isValidDate(airDate) || airDate < productionDate) {
    return res.status(400).json({ error: 'Tanggal tidak valid atau tanggal siar lebih awal dari tanggal produksi.' })
  }

  try {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM users WHERE name = $1 AND role = $2 AND is_active = TRUE',
      [producer.trim(), 'producer'],
    )
    if (!rowCount) return res.status(400).json({ error: 'Produser yang dipilih tidak memiliki akun aktif.' })
  } catch (error) {
    return next(error)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: sequenceRows } = await client.query("SELECT nextval('production_code_seq') AS value")
    const sequence = Number(sequenceRows[0].value)
    const [year, month] = productionDate.split('-')
    const id = `PRD-${month}${year.slice(-2)}-${String(sequence).padStart(3, '0')}`
    const { rows } = await client.query(
      `INSERT INTO productions (id, title, show_name, producer, pic, production_date, air_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${productionColumns}`,
      [id, title.trim(), show.trim(), producer.trim(), req.user.name, productionDate, airDate],
    )
    await client.query(
      `INSERT INTO notifications (type, title, description, production_id)
       VALUES ('Penugasan', 'Produksi baru dibuat', $1, $2)`,
      [`${title.trim()} dijadwalkan untuk ${producer.trim()}.`, id],
    )
    await client.query('COMMIT')
    res.status(201).json(rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

app.patch('/api/productions/:id', requireAuth, async (req, res, next) => {
  const allowedFields = {
    pic: new Set(),
    producer: new Set(['status', 'editor', 'issue', 'productionReport', 'productionCompletedAt']),
    nle: new Set(['status', 'issue', 'editingReport', 'editingCompletedAt']),
    admin: new Set(['status', 'editor', 'issue', 'productionReport', 'productionCompletedAt', 'editingReport', 'editingCompletedAt']),
  }[req.user.role]
  const suppliedFields = Object.keys(req.body ?? {})
  if (!allowedFields || suppliedFields.some((field) => !allowedFields.has(field))) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengubah data tersebut.' })
  }
  if (req.user.role === 'pic') {
    return res.status(403).json({ error: 'PIC hanya dapat membuat penugasan; hubungi Admin untuk koreksi data.' })
  }

  const {
    status,
    editor,
    issue,
    productionReport,
    productionCompletedAt,
    editingReport,
    editingCompletedAt,
  } = req.body ?? {}
  if (['producer', 'nle'].includes(req.user.role) && !status) {
    return res.status(400).json({ error: 'Status tahap wajib disertakan bersama laporan.' })
  }
  if (status !== undefined && !validStatuses.has(status)) {
    return res.status(400).json({ error: 'Status produksi tidak valid.' })
  }
  if (editor !== undefined && (typeof editor !== 'string' || !editor.trim())) {
    return res.status(400).json({ error: 'Nama editor tidak valid.' })
  }
  if (issue !== undefined && typeof issue !== 'string') {
    return res.status(400).json({ error: 'Laporan kendala tidak valid.' })
  }
  if ([productionReport, editingReport].some((value) => value !== undefined && typeof value !== 'string')) {
    return res.status(400).json({ error: 'Isi laporan harus berupa teks.' })
  }
  if ([productionCompletedAt, editingCompletedAt].some((value) => value !== undefined && value !== null && value !== '' && !isValidDateTime(value))) {
    return res.status(400).json({ error: 'Waktu penyelesaian tidak valid.' })
  }
  if (status === 'Proses editing'
      && (req.user.role === 'producer' || editor !== undefined)
      && (!editor?.trim() || !productionReport?.trim() || !productionCompletedAt || !isValidDateTime(productionCompletedAt))) {
    return res.status(400).json({ error: 'Laporan produksi dan waktu selesai wajib diisi sebelum diteruskan ke NLE.' })
  }
  if (status === 'Sudah selesai editing'
      && (!editingReport?.trim() || !editingCompletedAt || !isValidDateTime(editingCompletedAt))) {
    return res.status(400).json({ error: 'Laporan editing dan waktu selesai wajib diisi sebelum menandai editing selesai.' })
  }
  if (['Kendala produksi', 'Kendala editing'].includes(status) && !issue?.trim()) {
    return res.status(400).json({ error: 'Laporan kendala wajib diisi.' })
  }
  if (req.user.role === 'producer' && !productionReport?.trim()) {
    return res.status(400).json({ error: 'Laporan realisasi atau kendala produksi wajib diisi.' })
  }
  if (req.user.role === 'producer' && editor !== undefined && status !== 'Proses editing') {
    return res.status(400).json({ error: 'NLE hanya dapat ditetapkan saat produksi diteruskan.' })
  }
  if (req.user.role === 'nle' && status !== 'Produksi selesai' && !editingReport?.trim()) {
    return res.status(400).json({ error: 'Laporan progres atau kendala editing wajib diisi.' })
  }
  if ([status, editor, issue, productionReport, productionCompletedAt, editingReport, editingCompletedAt].every((value) => value === undefined)) {
    return res.status(400).json({ error: 'Tidak ada perubahan untuk disimpan.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: currentRows } = await client.query(
      'SELECT id, title, producer, editor, status FROM productions WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    const current = currentRows[0]
    if (!current) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Produksi tidak ditemukan.' })
    }
    if (!canAccessProduction(req.user, current)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Produksi ini bukan tanggung jawab akun Anda.' })
    }
    if (req.user.role === 'producer' && !['Terjadwal', 'Kendala produksi'].includes(current.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Tahap laporan produksi sudah ditutup.' })
    }
    if (req.user.role === 'nle' && !['Proses editing', 'Kendala editing', 'Sudah selesai editing'].includes(current.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Produksi belum diteruskan ke akun NLE Anda.' })
    }
    if (req.user.role === 'producer' && status && !['Proses editing', 'Kendala produksi'].includes(status)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Produser hanya dapat melaporkan produksi atau meneruskannya ke NLE.' })
    }
    if (req.user.role === 'nle' && status && !['Proses editing', 'Kendala editing', 'Sudah selesai editing'].includes(status)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'NLE hanya dapat memperbarui tahap editing.' })
    }
    if (editor !== undefined) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM users WHERE name = $1 AND role = $2 AND is_active = TRUE',
        [editor.trim(), 'nle'],
      )
      if (!rowCount) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'NLE yang dipilih tidak memiliki akun aktif.' })
      }
    }
    const { rows } = await client.query(
      `UPDATE productions
       SET status = COALESCE($2, status),
           editor = COALESCE($3, editor),
           issue = COALESCE($4, issue),
           production_report = COALESCE($5, production_report),
           production_completed_at = CASE
             WHEN $6::text IS NULL THEN production_completed_at
             WHEN $6::text = '' THEN NULL
             ELSE $6::timestamp
           END,
           editing_report = COALESCE($7, editing_report),
           editing_completed_at = CASE
             WHEN $8::text IS NULL THEN editing_completed_at
             WHEN $8::text = '' THEN NULL
             ELSE $8::timestamp
           END,
           submitted_at = CASE WHEN $2 IS NOT NULL THEN NULL ELSE submitted_at END,
           uploaded_file_name = CASE WHEN $2 IS NOT NULL THEN NULL ELSE uploaded_file_name END,
           uploaded_storage_name = CASE WHEN $2 IS NOT NULL THEN NULL ELSE uploaded_storage_name END,
           uploaded_file_size = CASE WHEN $2 IS NOT NULL THEN NULL ELSE uploaded_file_size END,
           uploaded_mime_type = CASE WHEN $2 IS NOT NULL THEN NULL ELSE uploaded_mime_type END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${productionColumns}`,
      [
        req.params.id,
        status ?? null,
        editor?.trim() ?? null,
        issue ?? null,
        productionReport ?? null,
        productionCompletedAt ?? null,
        editingReport ?? null,
        editingCompletedAt ?? null,
      ],
    )
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Produksi tidak ditemukan.' })
    }

    if (status) {
      const notificationType = ['Kendala produksi', 'Kendala editing'].includes(status)
        ? 'Kendala'
        : 'Penugasan'
      const notificationTitle = status === 'Kendala produksi'
        ? 'Kendala produksi dicatat'
        : status === 'Kendala editing'
          ? 'Kendala editing dicatat'
        : status === 'Sudah selesai editing'
          ? 'Editing selesai'
          : status === 'Proses editing'
            ? 'Produksi diteruskan ke NLE'
            : 'Progres produksi diperbarui'
      const description = ['Kendala produksi', 'Kendala editing'].includes(status)
        ? `${rows[0].title} — ${issue}`
        : `${rows[0].title} — status: ${status}.`
      await client.query(
        'INSERT INTO notifications (type, title, description, production_id) VALUES ($1, $2, $3, $4)',
        [notificationType, notificationTitle, description, req.params.id],
      )
    }

    await client.query('COMMIT')
    res.json(rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

app.post('/api/productions/:id/upload', requireAuth, requireRole('nle', 'admin'), requireProductionAccess, (req, res, next) => {
  fileUpload.single('file')(req, res, (error) => {
    if (error) return next(error)
    next()
  })
}, async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Pilih file final untuk diunggah.' })

  let client
  let transactionStarted = false
  let keepFile = false
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    transactionStarted = true
    const { rows: existingRows } = await client.query(
      'SELECT title, status, uploaded_storage_name FROM productions WHERE id = $1 FOR UPDATE',
      [req.params.id],
    )
    if (!existingRows[0]) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return res.status(404).json({ error: 'Produksi tidak ditemukan.' })
    }
    if (existingRows[0].status !== 'Sudah selesai editing') {
      await client.query('ROLLBACK')
      transactionStarted = false
      return res.status(409).json({ error: 'Selesaikan tahap editing sebelum mengunggah file ke server.' })
    }
    if (existingRows[0].uploaded_storage_name) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return res.status(409).json({ error: 'File final sudah tercatat untuk produksi ini.' })
    }

    const originalName = req.file.originalname
      .replace(/[\\/]/g, '_')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 255)
    const { rows } = await client.query(
      `UPDATE productions
       SET status = 'Produksi selesai',
           submitted_at = NOW(),
           uploaded_file_name = $2,
           uploaded_storage_name = $3,
           uploaded_file_size = $4,
           uploaded_mime_type = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${productionColumns}`,
      [req.params.id, originalName, req.file.filename, req.file.size, req.file.mimetype],
    )
    await client.query(
      `INSERT INTO notifications (type, title, description, production_id)
       VALUES ('Upload', 'Produksi selesai', $1, $2)`,
      [`${existingRows[0].title} — ${originalName}`, req.params.id],
    )
    await client.query('COMMIT')
    transactionStarted = false
    keepFile = true
    res.status(200).json(rows[0])
  } catch (error) {
    if (transactionStarted && client) {
      await client.query('ROLLBACK').catch((rollbackError) => console.error('Gagal membatalkan transaksi upload:', rollbackError))
    }
    next(error)
  } finally {
    client?.release()
    if (!keepFile) {
      await rm(req.file.path, { force: true }).catch((cleanupError) => {
        console.error('Gagal membersihkan file upload sementara:', cleanupError)
      })
    }
  }
})

app.get('/api/productions/:id/upload', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT uploaded_file_name AS name, uploaded_storage_name AS storage_name, producer, editor FROM productions WHERE id = $1',
      [req.params.id],
    )
    if (!rows[0]) {
      return res.status(404).json({ error: 'Produksi tidak ditemukan.' })
    }
    if (!canAccessProduction(req.user, rows[0])) {
      return res.status(403).json({ error: 'Produksi ini bukan tanggung jawab akun Anda.' })
    }
    if (!rows[0].storage_name) {
      return res.status(404).json({ error: 'File final belum diunggah.' })
    }
    if (path.basename(rows[0].storage_name) !== rows[0].storage_name) {
      return res.status(500).json({ error: 'Lokasi file tersimpan tidak valid.' })
    }
    res.download(path.join(uploadDir, rows[0].storage_name), rows[0].name, (error) => {
      if (error) next(error)
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/notifications', requireAuth, async (req, res, next) => {
  try {
    const scope = req.user.role === 'producer'
      ? { clause: 'WHERE p.producer = $1', value: req.user.name }
      : req.user.role === 'nle'
        ? { clause: 'WHERE p.editor = $1', value: req.user.name }
        : { clause: '', value: null }
    const { rows } = await pool.query(
      `SELECT n.id, n.type, n.title, n.description, n.unread,
              CASE
                WHEN n.created_at > NOW() - INTERVAL '1 minute' THEN 'Baru saja'
                ELSE to_char(n.created_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon · HH24:MI')
              END AS time
       FROM notifications n
       LEFT JOIN productions p ON p.id = n.production_id
       ${scope.clause}
       ORDER BY n.created_at DESC, n.id DESC`,
      scope.value ? [scope.value] : [],
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    const scope = req.user.role === 'producer'
      ? { clause: 'AND production_id IN (SELECT id FROM productions WHERE producer = $1)', value: req.user.name }
      : req.user.role === 'nle'
        ? { clause: 'AND production_id IN (SELECT id FROM productions WHERE editor = $1)', value: req.user.name }
        : { clause: '', value: null }
    const { rowCount } = await pool.query(
      `UPDATE notifications SET unread = FALSE WHERE unread = TRUE ${scope.clause}`,
      scope.value ? [scope.value] : [],
    )
    res.json({ updated: rowCount })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const scope = req.user.role === 'producer'
      ? { clause: 'AND production_id IN (SELECT id FROM productions WHERE producer = $1)', value: req.user.name }
      : req.user.role === 'nle'
        ? { clause: 'AND production_id IN (SELECT id FROM productions WHERE editor = $1)', value: req.user.name }
        : { clause: '', value: null }
    const { rowCount } = await pool.query(
      `UPDATE notifications SET unread = FALSE WHERE id = $1 AND unread = TRUE ${scope.clause}`,
      [req.params.id, ...(scope.value ? [scope.value] : [])],
    )
    if (!rowCount) {
      res.status(404).json({ error: 'Notifikasi tidak ditemukan atau sudah dibaca.' })
      return
    }
    res.json({ updated: rowCount })
  } catch (error) {
    next(error)
  }
})

app.use(express.static(distDir))
app.get(/.*/, async (_req, res, next) => {
  try {
    res.send(await readFile(path.join(distDir, 'index.html')))
  } catch (error) {
    next(error)
  }
})

app.use((req, res) => {
  res.status(404).json({ error: `Rute tidak ditemukan: ${req.method} ${req.path}` })
})

app.use((error, _req, res, _next) => {
  if (res.headersSent) return
  console.error(error)
  const status = error.code === 'LIMIT_FILE_SIZE'
    ? 413
    : Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500
  res.status(status).json({
    error: status === 413
      ? `Ukuran file melewati batas ${maxUploadSizeMb} MB.`
      : status === 500
        ? 'Terjadi kesalahan pada server.'
        : error.message,
  })
})

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

async function establishSession(req, user) {
  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve())
  })
  req.session.userId = user.id
  await new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve())
  })
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

async function requireProductionAccess(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, producer, editor FROM productions WHERE id = $1',
      [req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Produksi tidak ditemukan.' })
    if (!canAccessProduction(req.user, rows[0])) {
      return res.status(403).json({ error: 'Produksi ini bukan tanggung jawab akun Anda.' })
    }
    next()
  } catch (error) {
    next(error)
  }
}

function isValidDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false
  const [date, time] = value.split('T')
  const [hours, minutes, seconds = '0'] = time.split(':').map(Number)
  return isValidDate(date) && hours < 24 && minutes < 60 && seconds < 60
}

await mkdir(uploadDir, { recursive: true })
await initializeDatabase()
await seedDatabase()
app.listen(port, () => {
  console.log(`Express server berjalan di http://localhost:${port}`)
})
