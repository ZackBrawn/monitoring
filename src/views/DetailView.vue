<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { currentUser, completeProduction, demo, formatDate, formatDateTime, statusClasses } from '../data.js'

const route = useRoute()
const production = computed(() => demo.productions.find((item) => item.id === route.params.id))
const editingComplete = computed(() => ['Sudah selesai editing', 'Produksi selesai'].includes(production.value?.status))
const productionReported = computed(() => {
  return Boolean(production.value?.productionCompletedAt)
    || ['Proses editing', 'Kendala editing', 'Sudah selesai editing', 'Produksi selesai'].includes(production.value?.status)
})

const nextAction = computed(() => {
  const role = currentUser.value?.role
  const status = production.value?.status
  const id = production.value?.id
  if (!status || !id) return null
  if (status === 'Terjadwal' || status === 'Kendala produksi') {
    return role === 'producer' || role === 'admin'
      ? { label: 'Isi laporan', to: `/report/${id}` }
      : null
  }
  if (status === 'Proses editing' || status === 'Kendala editing') {
    return role === 'nle' || role === 'admin'
      ? { label: 'Buka editing', to: `/editing/${id}` }
      : null
  }
  if (status === 'Sudah selesai editing') {
    return role === 'nle' || role === 'admin'
      ? { label: 'Selesai produksi', complete: true }
      : null
  }
  return null
})

async function finishProduction() {
  await completeProduction(production.value.id)
}
</script>

<template>
  <section>
    <div v-if="production">
      <div class="page-heading">
        <div>
          <RouterLink class="text-muted text-[13px]" to="/">← Kembali</RouterLink>
          <h1 class="mt-4">{{ production.title }}</h1>
          <p>{{ production.id }}　/　{{ production.show }}　/　Produser: {{ production.producer }}　/　NLE: {{ production.editor }}</p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2.5">
          <button v-if="nextAction?.complete" class="button button-primary" type="button" @click="finishProduction">{{ nextAction.label }}</button>
          <RouterLink v-else-if="nextAction" class="button button-primary" :to="nextAction.to">{{ nextAction.label }} →</RouterLink>
          <span class="status min-h-10.5 rounded-lg px-4 py-0 text-[13px]" :class="statusClasses[production.status]">{{ production.status }}</span>
        </div>
      </div>

      <div class="grid grid-cols-[minmax(240px,0.7fr)_minmax(0,1.6fr)] gap-4.5 max-[700px]:grid-cols-1">
        <section class="panel production-info">
          <h2>Informasi produksi</h2>
          <dl class="mt-5 grid gap-4">
            <div><dt class="text-[10px] uppercase text-muted">Produser</dt><dd class="mt-1.25 text-[13px]">{{ production.producer }}</dd></div>
            <div><dt class="text-[10px] uppercase text-muted">NLE</dt><dd class="mt-1.25 text-[13px]">{{ production.editor }}</dd></div>
            <div><dt class="text-[10px] uppercase text-muted">PIC</dt><dd class="mt-1.25 text-[13px]">{{ production.pic }}</dd></div>
            <div><dt class="text-[10px] uppercase text-muted">Tgl produksi</dt><dd class="mt-1.25 text-[13px]">{{ formatDate(production.productionDate) }}</dd></div>
            <div><dt class="text-[10px] uppercase text-muted">Rencana siar</dt><dd class="mt-1.25 text-[13px]">{{ formatDate(production.airDate) }}</dd></div>
            <div v-if="production.issue"><dt class="text-[10px] uppercase text-muted">Kendala</dt><dd class="mt-1.25 text-[13px]">{{ production.issue }}</dd></div>
          </dl>
        </section>

        <section class="panel stage-history">
          <h2>Riwayat tahapan</h2>
          <div class="mt-4.5 grid gap-2.5">
            <article class="flex items-center justify-between gap-3.5 rounded-lg border border-line p-3 text-xs">
              <div><strong>01 Penugasan PIC</strong><small class="mt-1.25 block text-[10px] text-muted">{{ formatDateTime(production.createdAt) }} · {{ production.pic }}</small></div>
              <span class="status status-green">Selesai</span>
            </article>
            <article class="flex items-center justify-between gap-3.5 rounded-lg border border-line p-3 text-xs">
              <div><strong>02 Laporan produksi</strong><small class="mt-1.25 block text-[10px] text-muted">{{ production.productionCompletedAt ? formatDateTime(production.productionCompletedAt) : production.status === 'Kendala produksi' ? 'Kendala dicatat; menunggu produksi terlaksana' : 'Menunggu laporan produser' }}</small></div>
              <span class="status" :class="production.status === 'Kendala produksi' ? 'status-yellow' : productionReported ? 'status-green' : 'status-purple'">{{ production.status === 'Kendala produksi' ? 'Kendala' : productionReported ? 'Selesai' : 'Menunggu' }}</span>
            </article>
            <article class="flex items-center justify-between gap-3.5 rounded-lg border p-3 text-xs" :class="['Proses editing', 'Kendala editing', 'Sudah selesai editing'].includes(production.status) ? 'border-transparent bg-green' : 'border-line'">
              <div><strong>03 Proses editing</strong><small class="mt-1.25 block text-[10px] text-muted">{{ production.editingCompletedAt ? formatDateTime(production.editingCompletedAt) : production.editor }}</small></div>
              <span class="status" :class="production.status === 'Kendala editing' ? 'status-yellow' : editingComplete ? 'status-green' : production.status === 'Proses editing' ? 'status-blue' : 'status-purple'">{{ production.status === 'Kendala editing' ? 'Kendala' : editingComplete ? 'Selesai' : production.status === 'Proses editing' ? 'Berjalan' : 'Menunggu' }}</span>
            </article>
            <article class="flex items-center justify-between gap-3.5 rounded-lg border border-line p-3 text-xs">
              <div><strong>04 Selesai</strong><small class="mt-1.25 block text-[10px] text-muted">{{ production.uploadedFileName ? `${production.uploadedFileName} · ${formatDateTime(production.submittedAt)}` : 'Menunggu pengumpulan manual' }}</small></div>
              <span class="status" :class="statusClasses[production.status]">{{ production.status === 'Produksi selesai' ? 'Selesai' : 'Menunggu' }}</span>
            </article>
          </div>
        </section>

        <section class="panel col-span-full max-[700px]:col-auto">
          <h2>Laporan & progres</h2>
          <div v-if="production.productionReport" class="flex items-center justify-between gap-3.5 border-b border-line py-3 text-xs last:border-b-0">
            <span><strong>Laporan produksi · {{ production.producer }}</strong><small class="mt-1.25 block text-[10px] text-muted">{{ production.productionReport }}</small></span>
          </div>
          <div v-if="production.editingReport" class="flex items-center justify-between gap-3.5 border-b border-line py-3 text-xs last:border-b-0">
            <span><strong>Laporan editing · {{ production.editor }}</strong><small class="mt-1.25 block text-[10px] text-muted">{{ production.editingReport }}</small></span>
          </div>
          <div v-if="production.uploadedFileName" class="flex items-center justify-between gap-3.5 border-b border-line py-3 text-xs last:border-b-0">
            <span>
              <strong>File final · {{ production.uploadedFileName }}</strong>
              <small class="mt-1.25 block text-[10px] text-muted">{{ formatDateTime(production.submittedAt) }}</small>
            </span>
            <a class="link-button" :href="`/api/productions/${production.id}/upload`">Unduh →</a>
          </div>
          <p v-if="!production.productionReport && !production.editingReport && !production.uploadedFileName" class="empty-state">Belum ada laporan atau file yang dicatat.</p>
        </section>
      </div>
    </div>
    <div v-else class="panel empty-state">
      Produksi tidak ditemukan.
      <RouterLink class="button button-secondary mt-4" to="/">Kembali ke monitoring</RouterLink>
    </div>
  </section>
</template>

