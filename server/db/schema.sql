CREATE SEQUENCE IF NOT EXISTS production_code_seq START WITH 23;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('pic', 'producer', 'nle', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_role_name_unique ON users (role, name);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS productions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  show_name TEXT NOT NULL,
  producer TEXT NOT NULL,
  editor TEXT NOT NULL DEFAULT 'Belum ditugaskan',
  pic TEXT NOT NULL DEFAULT 'Dina Pratama',
  production_date DATE NOT NULL,
  air_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Terjadwal',
  issue TEXT NOT NULL DEFAULT '',
  production_report TEXT NOT NULL DEFAULT '',
  production_completed_at TIMESTAMP,
  editing_report TEXT NOT NULL DEFAULT '',
  editing_completed_at TIMESTAMP,
  submitted_at TIMESTAMPTZ,
  uploaded_file_name TEXT,
  uploaded_storage_name TEXT,
  uploaded_file_size BIGINT,
  uploaded_mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT productions_status_check CHECK (
    status IN ('Terjadwal', 'Proses editing', 'Kendala produksi', 'Kendala editing', 'Sudah selesai editing', 'Produksi selesai')
  )
);

ALTER TABLE productions ADD COLUMN IF NOT EXISTS production_report TEXT NOT NULL DEFAULT '';
ALTER TABLE productions ADD COLUMN IF NOT EXISTS production_completed_at TIMESTAMP;
ALTER TABLE productions ADD COLUMN IF NOT EXISTS editing_report TEXT NOT NULL DEFAULT '';
ALTER TABLE productions ADD COLUMN IF NOT EXISTS editing_completed_at TIMESTAMP;
ALTER TABLE productions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE productions ADD COLUMN IF NOT EXISTS uploaded_file_name TEXT;
ALTER TABLE productions ADD COLUMN IF NOT EXISTS uploaded_storage_name TEXT;
ALTER TABLE productions ADD COLUMN IF NOT EXISTS uploaded_file_size BIGINT;
ALTER TABLE productions ADD COLUMN IF NOT EXISTS uploaded_mime_type TEXT;

ALTER TABLE productions DROP CONSTRAINT IF EXISTS productions_status_check;
UPDATE productions
SET status = 'Produksi selesai'
WHERE status = 'Sudah dikumpulkan';
UPDATE productions
SET production_report = 'Pengambilan gambar dan audio telah selesai.',
    production_completed_at = COALESCE(production_completed_at, '2026-11-10 16:30'::timestamp),
    editing_report = COALESCE(NULLIF(editing_report, ''), 'Editing sedang berlangsung.')
WHERE id = 'PRD-1126-018' AND status = 'Proses editing' AND production_report = '';
UPDATE productions
SET editor = 'Belum ditugaskan'
WHERE id = 'PRD-1126-020' AND status = 'Kendala produksi'
  AND production_report = '' AND production_completed_at IS NULL;
UPDATE productions
SET production_report = 'Pengambilan gambar selesai dan materi diteruskan ke NLE.',
    production_completed_at = COALESCE(production_completed_at, '2026-11-08 16:30'::timestamp),
    editing_report = COALESCE(NULLIF(editing_report, ''), 'Editing final selesai dan sudah melalui QC.'),
    editing_completed_at = COALESCE(editing_completed_at, '2026-11-10 10:20'::timestamp)
WHERE id = 'PRD-1126-016' AND status = 'Sudah selesai editing';
UPDATE productions
SET production_report = 'Produksi selesai dan materi diteruskan ke NLE.',
    production_completed_at = COALESCE(production_completed_at, '2026-11-20 16:30'::timestamp),
    editing_report = COALESCE(NULLIF(editing_report, ''), 'Editing final selesai dan siap diselesaikan.'),
    editing_completed_at = COALESCE(editing_completed_at, '2026-11-22 10:20'::timestamp)
WHERE id = 'PRD-1126-022' AND status = 'Sudah selesai editing';
ALTER TABLE productions ADD CONSTRAINT productions_status_check CHECK (
  status IN ('Terjadwal', 'Proses editing', 'Kendala produksi', 'Kendala editing', 'Sudah selesai editing', 'Produksi selesai')
);
ALTER TABLE productions DROP CONSTRAINT IF EXISTS production_submission_has_file;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Kendala', 'Upload', 'Penugasan')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  production_id TEXT REFERENCES productions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS production_id TEXT REFERENCES productions(id) ON DELETE SET NULL;
UPDATE notifications
SET type = 'Penugasan',
    title = 'Editing selesai',
    description = 'Materi editing selesai dan menunggu upload ke server.'
WHERE id IN (2, 4) AND title IN ('Upload selesai', 'Sudah dikumpulkan');
