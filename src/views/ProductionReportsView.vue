<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { currentMonth, currentUser, demo, formatDate, statusClasses } from '../data.js'

const route = useRoute()
const query = ref('')
const monthFilter = ref(currentMonth())
const requestedStatus = computed(() => {
  const status = route.query.status
  return ['Terjadwal', 'Kendala produksi'].includes(status) ? status : ''
})
const isPic = computed(() => currentUser.value?.role === 'pic')

const monthProductions = computed(() => demo.productions.filter((production) => {
  return !monthFilter.value || production.productionDate.startsWith(monthFilter.value)
}))
const reportsNeeded = computed(() => monthProductions.value
  .filter((production) => ['Terjadwal', 'Kendala produksi'].includes(production.status))
  .filter((production) => !requestedStatus.value || production.status === requestedStatus.value)
  .filter((production) => `${production.title} ${production.producer} ${production.id}`
    .toLowerCase()
    .includes(query.value.toLowerCase()))
  .sort((a, b) => a.productionDate.localeCompare(b.productionDate)))
const issueCount = computed(() => monthProductions.value.filter((production) => {
  return production.status === 'Kendala produksi'
}).length)
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">Alur produser</p>
        <h1>{{ requestedStatus || (isPic ? 'Produksi yang perlu ditindaklanjuti.' : 'Laporan realisasi produksi.') }}</h1>
        <p v-if="isPic">Tinjau detail produksi. Pengisian laporan hanya dapat dilakukan oleh Produser.</p>
        <p v-else>Pilih jadwal untuk mencatat hasil produksi atau tindak lanjut kendala.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Perlu laporan</span>
        <strong class="mt-2 block text-3xl">{{ reportsNeeded.length }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Produksi belum selesai</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Ada kendala</span>
        <strong class="mt-2 block text-3xl">{{ issueCount }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Perlu dicatat atau diperbarui</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Periode</span>
        <strong class="mt-2 block text-xl">{{ monthFilter || 'Semua bulan' }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Tanggal produksi</span>
      </article>
    </div>

    <div class="mt-8 mb-4">
      <h2 class="text-xl font-semibold">Produksi yang membutuhkan laporan</h2>
      <p class="mt-1 text-sm text-stone-600">Laporan yang disimpan akan memperbarui status dan diteruskan ke NLE bila siap.</p>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_190px]">
      <label class="sr-only" for="report-search">Cari produksi untuk laporan</label>
      <input id="report-search" v-model="query" class="filter-control" placeholder="Cari judul, produser, atau ID..." />
      <label class="sr-only" for="report-month">Filter bulan produksi</label>
      <input id="report-month" v-model="monthFilter" class="filter-control" type="month" />
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Judul produksi</th>
            <th>Produser</th>
            <th>Tgl produksi</th>
            <th>Status terkini</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="production in reportsNeeded" :key="production.id">
            <td class="title-cell">{{ production.title }}<small>{{ production.show }} · {{ production.id }}</small></td>
            <td>{{ production.producer }}</td>
            <td>{{ formatDate(production.productionDate) }}</td>
            <td><span class="status" :class="statusClasses[production.status]">{{ production.status }}</span></td>
            <td>
              <div class="flex flex-wrap gap-3">
                <RouterLink class="link-button" :to="`/detail/${production.id}`">Detail →</RouterLink>
                <RouterLink v-if="!isPic" class="link-button" :to="`/report/${production.id}`">Isi laporan →</RouterLink>
              </div>
            </td>
          </tr>
          <tr v-if="reportsNeeded.length === 0">
            <td colspan="5" class="empty-state">Tidak ada produksi yang memerlukan laporan pada filter ini.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
