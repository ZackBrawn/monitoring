<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { currentMonth, demo, formatDate, statusClasses } from '../data.js'

const query = ref('')
const statusFilter = ref('')
const monthFilter = ref(currentMonth())
const monthLabel = computed(() => {
  if (!monthFilter.value) return 'Semua bulan'
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(`${monthFilter.value}-01T00:00:00`))
})
const monthProductions = computed(() => demo.productions.filter((item) => item.productionDate.startsWith(monthFilter.value)))

const filteredProductions = computed(() => demo.productions.filter((production) => {
  const matchesQuery = `${production.title} ${production.producer} ${production.id}`
    .toLowerCase()
    .includes(query.value.toLowerCase())
  const matchesStatus = !statusFilter.value || production.status === statusFilter.value
  const matchesMonth = !monthFilter.value || production.productionDate.startsWith(monthFilter.value)
  return matchesQuery && matchesStatus && matchesMonth
}))

const counts = computed(() => ({
  total: monthProductions.value.length,
  active: monthProductions.value.filter((item) => ['Terjadwal', 'Proses editing', 'Sudah selesai editing'].includes(item.status)).length,
  productionIssues: monthProductions.value.filter((item) => item.status === 'Kendala produksi').length,
  editingIssues: monthProductions.value.filter((item) => item.status === 'Kendala editing').length,
  issue: monthProductions.value.filter((item) => ['Kendala produksi', 'Kendala editing'].includes(item.status)).length,
  submitted: monthProductions.value.filter((item) => item.status === 'Produksi selesai').length,
}))
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">Monitoring produksi</p>
        <h1>Semua produksi, satu kendali.</h1>
        <p>Pantau progres tim dari rencana produksi hingga masuk ke server.</p>
      </div>
      <RouterLink class="button button-primary" to="/input">+ Tambah produksi</RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Total produksi</span>
        <strong class="mt-2 block text-3xl">{{ counts.total }}</strong>
        <span class="mt-2 block text-xs text-stone-600">{{ monthLabel }}</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Dalam proses</span>
        <strong class="mt-2 block text-3xl">{{ counts.active }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Produksi terjadwal dan editing</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Ada kendala</span>
        <strong class="mt-2 block text-3xl">{{ counts.issue }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Perlu tindak lanjut tim</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Produksi selesai</span>
        <strong class="mt-2 block text-3xl">{{ counts.submitted }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Hasil tersedia di server</span>
      </article>
    </div>

    <div v-if="counts.issue" class="notice-banner mt-5 flex justify-between gap-4 rounded-[9px] bg-cream px-5 py-4 text-[13px] max-[620px]:flex-col">
      <span>{{ counts.issue }} produksi mengalami kendala. Pastikan jadwal siar tetap sesuai rencana.</span>
      <div class="notice-links flex flex-wrap gap-3">
        <RouterLink v-if="counts.productionIssues" class="shrink-0 font-semibold" to="/report?status=Kendala%20produksi">Kendala produksi →</RouterLink>
        <RouterLink v-if="counts.editingIssues" class="shrink-0 font-semibold" to="/editing?status=Kendala%20editing">Kendala editing →</RouterLink>
      </div>
    </div>

    <div class="mt-8 mb-4">
      <h2 class="text-xl font-semibold">Daftar produksi</h2>
      <p class="mt-1 text-sm text-stone-600">Kelola jadwal, penanggung jawab, dan status terbaru.</p>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_180px_190px]">
      <label class="sr-only" for="production-search">Cari produksi</label>
      <input id="production-search" v-model="query" class="filter-control" placeholder="Cari judul produksi atau acara..." />
      <label class="sr-only" for="status-filter">Filter status</label>
      <select id="status-filter" v-model="statusFilter" class="filter-control">
        <option value="">Semua status</option>
        <option>Terjadwal</option>
        <option>Proses editing</option>
        <option>Kendala produksi</option>
        <option>Kendala editing</option>
        <option>Sudah selesai editing</option>
        <option>Produksi selesai</option>
      </select>
      <label class="sr-only" for="month-filter">Filter bulan produksi</label>
      <input id="month-filter" v-model="monthFilter" class="filter-control" type="month" />
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Judul produksi</th>
            <th>Produser / NLE</th>
            <th>Tgl produksi</th>
            <th>Rencana siar</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="production in filteredProductions" :key="production.id">
            <td class="title-cell">
              {{ production.title }}
              <small>{{ production.show }} · {{ production.id }}</small>
            </td>
            <td>{{ production.producer }}<small>{{ production.editor }}</small></td>
            <td>{{ formatDate(production.productionDate) }}</td>
            <td>{{ formatDate(production.airDate) }}</td>
            <td><span class="status" :class="statusClasses[production.status]">{{ production.status }}</span></td>
            <td><RouterLink class="link-button" :to="`/detail/${production.id}`">Detail →</RouterLink></td>
          </tr>
          <tr v-if="filteredProductions.length === 0">
            <td colspan="6" class="empty-state">Tidak ada produksi yang cocok dengan filter.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-3 text-xs text-stone-600">Menampilkan {{ filteredProductions.length }} dari {{ counts.total }} produksi pada {{ monthLabel }}.</p>
  </section>
</template>
