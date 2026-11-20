<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { completeProduction, currentMonth, demo, formatDate, statusClasses } from '../data.js'
import { currentUser } from '../data.js'

const route = useRoute()
const query = ref('')
const monthFilter = ref(currentMonth())
const requestedStatus = computed(() => route.query.status === 'Kendala editing' ? route.query.status : '')
const isPic = computed(() => currentUser.value?.role === 'pic')

const monthProductions = computed(() => demo.productions.filter((production) => {
  return !monthFilter.value || production.productionDate.startsWith(monthFilter.value)
}))
const editingQueue = computed(() => monthProductions.value
  .filter((production) => production.editor !== 'Belum ditugaskan')
  .filter((production) => ['Proses editing', 'Kendala editing', 'Sudah selesai editing', 'Produksi selesai'].includes(production.status))
  .filter((production) => !requestedStatus.value || production.status === requestedStatus.value)
  .filter((production) => `${production.title} ${production.editor} ${production.id}`
    .toLowerCase()
    .includes(query.value.toLowerCase()))
  .sort((a, b) => a.productionDate.localeCompare(b.productionDate)))
const inProgressCount = computed(() => monthProductions.value.filter((production) => {
  return production.status === 'Proses editing'
}).length)
const awaitingUploadCount = computed(() => monthProductions.value.filter((production) => {
  return production.status === 'Sudah selesai editing'
}).length)
const issueCount = computed(() => monthProductions.value.filter((production) => {
  return ['Kendala produksi', 'Kendala editing'].includes(production.status)
}).length)

async function finishProduction(id) {
  await completeProduction(id)
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">Alur NLE</p>
        <h1>{{ requestedStatus || (isPic ? 'Produksi untuk ditindaklanjuti.' : 'Antrean editing & pengumpulan.') }}</h1>
        <p v-if="isPic">Tinjau detail kendala. Perubahan editing hanya dapat dilakukan oleh NLE yang ditugaskan.</p>
        <p v-else>Pilih materi untuk memperbarui progres editing atau menandai hasil yang sudah selesai.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Dalam editing</span>
        <strong class="mt-2 block text-3xl">{{ inProgressCount }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Perlu pembaruan progres</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Menunggu pengumpulan</span>
        <strong class="mt-2 block text-3xl">{{ awaitingUploadCount }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Editing selesai, belum selesai produksi</span>
      </article>
      <article class="stat-card p-5 shadow-sm">
        <span class="text-xs text-stone-600">Ada kendala</span>
        <strong class="mt-2 block text-3xl">{{ issueCount }}</strong>
        <span class="mt-2 block text-xs text-stone-600">Produksi perlu ditindaklanjuti</span>
      </article>
    </div>

    <div class="mt-8 mb-4">
      <h2 class="text-xl font-semibold">Materi untuk ditangani</h2>
      <p class="mt-1 text-sm text-stone-600">Tugas ditampilkan setelah memiliki editor dan laporan produksi.</p>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_190px]">
      <label class="sr-only" for="editing-search">Cari materi editing</label>
      <input id="editing-search" v-model="query" class="filter-control" placeholder="Cari judul, NLE, atau ID..." />
      <label class="sr-only" for="editing-month">Filter bulan produksi</label>
      <input id="editing-month" v-model="monthFilter" class="filter-control" type="month" />
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Judul produksi</th>
            <th>NLE</th>
            <th>Tgl produksi</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="production in editingQueue" :key="production.id">
            <td class="title-cell">{{ production.title }}<small>{{ production.show }} · {{ production.id }}</small></td>
            <td>{{ production.editor }}</td>
            <td>{{ formatDate(production.productionDate) }}</td>
            <td><span class="status" :class="statusClasses[production.status]">{{ production.status }}</span></td>
            <td>
              <div class="flex flex-wrap gap-3">
                <RouterLink class="link-button" :to="`/detail/${production.id}`">Detail →</RouterLink>
                <button v-if="!isPic && production.status === 'Sudah selesai editing'" class="link-button" type="button" @click="finishProduction(production.id)">
                  Selesai produksi
                </button>
                <RouterLink v-else-if="!isPic && production.status !== 'Produksi selesai'" class="link-button" :to="`/editing/${production.id}`">
                  Buka editing →
                </RouterLink>
              </div>
            </td>
          </tr>
          <tr v-if="editingQueue.length === 0">
            <td colspan="5" class="empty-state">Belum ada materi yang ditugaskan ke NLE pada filter ini.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
