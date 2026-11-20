<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { currentMonth, demo, formatDate, statusClasses } from '../data.js'

const query = ref('')
const monthFilter = ref(currentMonth())

const monthLabel = computed(() => {
  if (!monthFilter.value) return 'Semua bulan'
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(`${monthFilter.value}-01T00:00:00`))
})
const monthProductions = computed(() => demo.productions.filter((production) => {
  return !monthFilter.value || production.productionDate.startsWith(monthFilter.value)
}))
const upcomingProductions = computed(() => monthProductions.value
  .filter((production) => production.status === 'Terjadwal')
  .filter((production) => `${production.title} ${production.producer} ${production.id}`
    .toLowerCase()
    .includes(query.value.toLowerCase()))
  .sort((a, b) => a.productionDate.localeCompare(b.productionDate)))
const activeCount = computed(() => monthProductions.value.filter((production) => {
  return ['Terjadwal', 'Proses editing'].includes(production.status)
}).length)
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">Penugasan produksi</p>
        <h1>Rencanakan produksi berikutnya.</h1>
        <p>Tinjau jadwal dan produser sebelum membuat penugasan baru.</p>
      </div>
      <RouterLink class="button button-primary" to="/input/new">+ Buat penugasan</RouterLink>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Jadwal produksi</span>
        <strong class="mt-2 block text-3xl">{{ monthProductions.length }}</strong>
        <span class="mt-2 block text-xs text-stone-600">{{ monthLabel }}</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Belum mulai</span>
        <strong class="mt-2 block text-3xl">{{ upcomingProductions.length }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Menunggu laporan produser</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Dalam alur kerja</span>
        <strong class="mt-2 block text-3xl">{{ activeCount }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Terjadwal atau sedang editing</span>
      </article>
    </div>

    <div class="mt-8 mb-4">
      <h2 class="text-xl font-semibold">Penugasan terjadwal</h2>
      <p class="mt-1 text-sm text-stone-600">Pastikan jadwal dan produser sudah sesuai sebelum menambah tugas.</p>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_190px]">
      <label class="sr-only" for="assignment-search">Cari penugasan</label>
      <input
        id="assignment-search"
        v-model="query"
        class="filter-control"
        placeholder="Cari judul, produser, atau ID..."
      />
      <label class="sr-only" for="assignment-month">Filter bulan produksi</label>
      <input id="assignment-month" v-model="monthFilter" class="filter-control" type="month" />
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Judul produksi</th>
            <th>Produser</th>
            <th>Tgl produksi</th>
            <th>Rencana siar</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="production in upcomingProductions" :key="production.id">
            <td class="title-cell">
              {{ production.title }}
              <small>{{ production.show }} · {{ production.id }}</small>
            </td>
            <td>{{ production.producer }}</td>
            <td>{{ formatDate(production.productionDate) }}</td>
            <td>{{ formatDate(production.airDate) }}</td>
            <td><span class="status" :class="statusClasses[production.status]">{{ production.status }}</span></td>
            <td><RouterLink class="link-button" :to="`/detail/${production.id}`">Detail →</RouterLink></td>
          </tr>
          <tr v-if="upcomingProductions.length === 0">
            <td colspan="6" class="empty-state">Tidak ada penugasan terjadwal yang cocok.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="assignment-note mt-5 flex flex-wrap gap-x-4 gap-y-2 rounded-[9px] bg-cream px-5 py-4 text-xs">
      <strong>Alur penugasan</strong>
      <span class="text-muted">PIC membuat jadwal → produser mengisi laporan → NLE mengerjakan editing → hasil selesai produksi.</span>
    </div>
  </section>
</template>
