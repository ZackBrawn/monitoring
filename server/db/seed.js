import pool from '../db.js'

const productionSeeds = [
  ['PRD-1126-018', 'Ruang Kota: Mobilitas Masa Depan', 'Ruang Kota', 'Andi Saputra', 'Rizky Maulana', 'Dina Pratama', '2026-11-10', '2026-11-15', 'Proses editing', '', 'Pengambilan gambar dan audio telah selesai.', '2026-11-10 16:30', 'Editing sedang berlangsung.', null, null],
  ['PRD-1126-019', 'Jejak Rasa: Dapur Nusantara', 'Jejak Rasa', 'Maya Putri', 'Belum ditugaskan', 'Raka Wijaya', '2026-11-12', '2026-11-17', 'Terjadwal', '', '', null, '', null, null],
  ['PRD-1126-020', 'Lensa Pagi: Cerita Pasar', 'Lensa Pagi', 'Dimas Prakoso', 'Belum ditugaskan', 'Dina Pratama', '2026-11-11', '2026-11-14', 'Kendala produksi', 'Cuaca mengganggu jadwal.', '', null, '', null, null],
  ['PRD-1126-016', 'Ruang Kota: Kota Ramah Anak', 'Ruang Kota', 'Andi Saputra', 'Siti Rahma', 'Dina Pratama', '2026-11-08', '2026-11-13', 'Sudah selesai editing', '', 'Pengambilan gambar selesai dan materi diteruskan ke NLE.', '2026-11-08 16:30', 'Editing final selesai dan sudah melalui QC.', '2026-11-10 10:20', null],
  ['PRD-1126-021', 'Ruang Kota: Pasar Minggu', 'Ruang Kota', 'Andi Saputra', 'Rizky Maulana', 'Dina Pratama', '2026-11-18', '2026-11-22', 'Terjadwal', '', '', null, '', null, null],
  ['PRD-1126-022', 'Jejak Rasa: Sajian Pesisir', 'Jejak Rasa', 'Maya Putri', 'Nadia Putri', 'Raka Wijaya', '2026-11-20', '2026-11-24', 'Sudah selesai editing', '', 'Produksi selesai dan materi diteruskan ke NLE.', '2026-11-20 16:30', 'Editing final selesai dan siap diselesaikan.', '2026-11-22 10:20', null],
]

const notificationSeeds = [
  [1, 'Kendala', 'Kendala dicatat', 'Lensa Pagi: Cerita Pasar — cuaca mengganggu jadwal.', '2026-11-11T08:30:00+07:00', 'PRD-1126-020'],
  [2, 'Penugasan', 'Editing selesai', 'Ruang Kota: Mobilitas Masa Depan — menunggu penyelesaian produksi.', '2026-11-12T11:05:00+07:00', 'PRD-1126-018'],
  [3, 'Penugasan', 'Penugasan baru', 'Jejak Rasa ditugaskan ke Maya Putri.', '2026-11-12T09:00:00+07:00', 'PRD-1126-019'],
  [4, 'Penugasan', 'Editing selesai', 'Ruang Kota 016 — menunggu penyelesaian produksi.', '2026-11-08T15:20:00+07:00', 'PRD-1126-016'],
  [5, 'Kendala', 'Kendala ditindak', 'Perubahan jadwal Ruang Kota 020 disetujui PIC.', '2026-11-07T17:10:00+07:00', 'PRD-1126-020'],
]

export async function seedDatabase() {
  const client = await pool.connect()
  let productionsInserted = 0
  let notificationsInserted = 0

  try {
    await client.query('BEGIN')
    for (const seed of productionSeeds) {
      const { rowCount } = await client.query(
        `INSERT INTO productions
          (id, title, show_name, producer, editor, pic, production_date, air_date, status, issue,
           production_report, production_completed_at, editing_report, editing_completed_at, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        seed,
      )
      productionsInserted += rowCount
    }

    for (const [id, type, title, description, createdAt, productionId] of notificationSeeds) {
      const { rowCount } = await client.query(
        `INSERT INTO notifications (id, type, title, description, created_at, production_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [id, type, title, description, createdAt, productionId],
      )
      notificationsInserted += rowCount
    }

    await client.query(
      `UPDATE notifications
       SET production_id = CASE id
         WHEN 1 THEN 'PRD-1126-020'
         WHEN 2 THEN 'PRD-1126-018'
         WHEN 3 THEN 'PRD-1126-019'
         WHEN 4 THEN 'PRD-1126-016'
         WHEN 5 THEN 'PRD-1126-020'
       END
       WHERE id BETWEEN 1 AND 5 AND production_id IS NULL`,
    )
    await client.query(
      `SELECT setval(
        pg_get_serial_sequence('notifications', 'id'),
        COALESCE(MAX(id), 1),
        MAX(id) IS NOT NULL
      )
       FROM notifications`,
    )
    await client.query('COMMIT')
    return { productionsInserted, notificationsInserted }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
