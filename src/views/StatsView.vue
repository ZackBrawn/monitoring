<script setup>
import { computed, ref } from 'vue'
import { currentMonth, demo } from '../data.js'

const month = ref(currentMonth())
const selectedMonth = computed(() => month.value || currentMonth())
const monthLabel = computed(() => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
  .format(new Date(`${selectedMonth.value}-01T00:00:00`)))
const productions = computed(() => demo.productions.filter((item) => item.productionDate.startsWith(selectedMonth.value)))
const total = computed(() => productions.value.length)
const submittedProductions = computed(() => productions.value.filter((item) => item.status === 'Produksi selesai'))
const submitted = computed(() => submittedProductions.value.length)
const submittedWithTime = computed(() => submittedProductions.value.filter((item) => item.submittedAt))
const issues = computed(() => productions.value.filter((item) => ['Kendala produksi', 'Kendala editing'].includes(item.status)).length)
const onTime = computed(() => submittedWithTime.value.filter((item) => {
  const submittedDate = item.submittedAt instanceof Date
    ? item.submittedAt.toISOString().slice(0, 10)
    : String(item.submittedAt).slice(0, 10)
  return submittedDate <= item.airDate
}).length)
const onTimeRate = computed(() => submittedWithTime.value.length
  ? `${Math.round(onTime.value / submittedWithTime.value.length * 100)}%`
  : '—')
const statusSummary = computed(() => [
  { label: 'Terjadwal', color: 'var(--purple)', count: productions.value.filter((item) => item.status === 'Terjadwal').length },
  { label: 'Proses editing', color: 'var(--blue)', count: productions.value.filter((item) => item.status === 'Proses editing').length },
  { label: 'Kendala', color: 'var(--yellow)', count: issues.value },
  { label: 'Sudah selesai editing', color: 'var(--orange)', count: productions.value.filter((item) => item.status === 'Sudah selesai editing').length },
  { label: 'Produksi selesai', color: 'var(--green)', count: submitted.value },
])
const weekly = computed(() => {
  const [year, monthNumber] = selectedMonth.value.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
    const start = index * 7 + 1
    const end = Math.min(start + 6, daysInMonth)
    const count = productions.value.filter((item) => {
      const day = Number(item.productionDate.slice(-2))
      return day >= start && day <= end
    }).length
    return { label: `${start}–${end}`, count }
  })
})
const issueCategories = computed(() => {
  const categories = [
    { label: 'Perubahan jadwal', count: 0 },
    { label: 'Cuaca / lokasi', count: 0 },
    { label: 'Lainnya', count: 0 },
  ]
  for (const production of productions.value) {
    if (!['Kendala produksi', 'Kendala editing'].includes(production.status)) continue
    const issue = production.issue.toLowerCase()
    const category = issue.includes('jadwal')
      ? categories[0]
      : issue.includes('cuaca') || issue.includes('lokasi')
        ? categories[1]
        : categories[2]
    category.count += 1
  }
  return categories
})
const maxIssueCount = computed(() => Math.max(1, ...issueCategories.value.map((item) => item.count)))
const recentNotifications = computed(() => demo.notifications.slice(0, 3))
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <h1>Laporan & statistik</h1>
        <p>Ringkasan kinerja produksi bulan {{ monthLabel }}.</p>
      </div>
      <label class="sr-only" for="stats-month">Pilih bulan laporan</label>
      <input id="stats-month" v-model="month" class="filter-control w-auto min-w-45" type="month" />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article class="stat-card p-5"><span class="eyebrow">Produksi</span><strong class="my-2 block text-[30px] font-semibold">{{ total }}</strong><small class="text-[11px] text-muted">{{ monthLabel }}</small></article>
      <article class="stat-card p-5"><span class="eyebrow">Selesai</span><strong class="my-2 block text-[30px] font-semibold">{{ submitted }}</strong><small class="text-[11px] text-muted">sudah selesai</small></article>
      <article class="stat-card p-5"><span class="eyebrow">Ketepatan jadwal</span><strong class="my-2 block text-[30px] font-semibold">{{ onTimeRate }}</strong><small class="text-[11px] text-muted">{{ onTime }} dari {{ submittedWithTime.length }} hasil dengan waktu tercatat tepat waktu</small></article>
      <article class="stat-card p-5"><span class="eyebrow">Kendala</span><strong class="my-2 block text-[30px] font-semibold">{{ issues }}</strong><small class="text-[11px] text-muted">perlu tindak lanjut</small></article>
    </div>

    <div class="mt-5 grid grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)] gap-4.5 max-[700px]:grid-cols-1">
      <section class="panel">
        <h2>Produksi per minggu</h2>
        <div class="flex h-61.25 items-end justify-around px-2.5 pt-5">
          <div v-for="week in weekly" :key="week.label" class="flex h-full w-[18%] flex-col items-center justify-end gap-2 text-xs">
            <span>{{ week.count }}</span>
            <div class="w-[min(60px,70%)] rounded-t-[7px] bg-orange" :style="{ height: `${week.count * 24}px` }" />
            <small class="text-[10px] text-muted">Minggu {{ week.label }}</small>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2>Status produksi</h2>
        <div class="mt-6 grid gap-5.25">
          <div v-for="item in statusSummary" :key="item.label" class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-2.5"><i class="h-2.75 w-2.75 rounded-full" :style="{ background: item.color }" />{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </section>
      <section class="panel col-start-1 max-[700px]:col-auto">
        <h2>Kendala terbanyak</h2>
        <div v-for="item in issueCategories" :key="item.label" class="mt-4.5 grid grid-cols-[1fr_minmax(60px,120px)_20px] items-center gap-3.5 text-[11px]">
          <span>{{ item.label }}</span>
          <i class="h-1.75 rounded-lg bg-[#eee5d7]"><b class="block h-full rounded-[inherit] bg-orange" :style="{ width: `${item.count / maxIssueCount * 100}%` }" /></i>
          <strong>{{ item.count }}</strong>
        </div>
      </section>
      <section class="panel">
        <h2>Aktivitas terbaru</h2>
        <ul v-if="recentNotifications.length" class="mt-5 grid list-none gap-3.5 p-0 text-[11px]">
          <li v-for="notification in recentNotifications" :key="notification.id" class="flex items-start gap-2.5">
            <i class="h-2.75 w-2.75 rounded-full" :class="notification.type === 'Kendala' ? 'bg-yellow' : 'bg-green'" />
            <span class="flex-1">{{ notification.title }} · {{ notification.description }} · {{ notification.time }}</span>
          </li>
        </ul>
        <p v-else class="empty-state">Belum ada aktivitas pada periode ini.</p>
      </section>
    </div>
  </section>
</template>
