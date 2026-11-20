<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { completeProduction, dateTimeInputValue, demo, formatDateTime, statusClasses, updateProduction } from '../data.js'

const router = useRouter()
const route = useRoute()
const selectedId = ref(typeof route.params.id === 'string' ? route.params.id : '')
const editorStatus = ref('Proses editing')
const editingReport = ref('')
const editingCompletedAt = ref(dateTimeInputValue())
const saveMessage = ref('')
const production = computed(() => demo.productions.find((item) => item.id === selectedId.value))
const isUploaded = computed(() => production.value?.status === 'Produksi selesai')

watch(production, (item) => {
  if (!item) return
  editorStatus.value = ['Sudah selesai editing', 'Produksi selesai'].includes(item.status)
    ? 'Sudah selesai editing'
    : ['Kendala produksi', 'Kendala editing'].includes(item.status)
      ? 'Ada kendala'
      : 'Proses editing'
  editingReport.value = item.editingReport || ''
  editingCompletedAt.value = dateTimeInputValue(item.editingCompletedAt || new Date())
}, { immediate: true })

watch(() => route.params.id, (id) => {
  if (typeof id === 'string' && id !== selectedId.value) selectedId.value = id
})

watch(selectedId, (id) => {
  if (id && route.params.id !== id) router.replace(`/editing/${id}`)
})

async function saveEditing() {
  if (!production.value || isUploaded.value) return
  const completed = editorStatus.value === 'Sudah selesai editing'
  await updateProduction(production.value.id, {
    status: completed ? 'Sudah selesai editing' : editorStatus.value === 'Ada kendala' ? 'Kendala editing' : 'Proses editing',
    issue: editorStatus.value === 'Ada kendala' ? editingReport.value : '',
    editingReport: editingReport.value,
    editingCompletedAt: completed ? editingCompletedAt.value : '',
  })
  saveMessage.value = completed
    ? 'Editing selesai. Laporan berhasil disimpan.'
    : 'Laporan editing berhasil disimpan.'
}
async function finishProduction() {
  await completeProduction(production.value.id)
  saveMessage.value = 'Produksi selesai ditandai. Upload file dilakukan manual.'
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <RouterLink class="text-muted text-[13px]" to="/editing">← Kembali ke antrean editing</RouterLink>
        <h1 class="mt-4">{{ production?.title || 'Editing & pengumpulan' }}</h1>
        <p>{{ production?.id }} · {{ production?.show }} · NLE: {{ production?.editor }}</p>
      </div>
      <span v-if="production" class="status" :class="statusClasses[production.status]">{{ production.status }}</span>
    </div>

    <div v-if="production" class="mb-5 grid grid-cols-4 gap-2 rounded-[10px] bg-cream p-3.5 max-[760px]:grid-cols-2">
      <div class="p-2 text-xs"><b>01 Penugasan PIC</b><small class="mt-1.5 block text-muted">{{ formatDateTime(production.createdAt) }}</small></div>
      <div class="p-2 text-xs"><b>02 Laporan produksi</b><small class="mt-1.5 block text-muted">{{ production.productionCompletedAt ? formatDateTime(production.productionCompletedAt) : 'Menunggu laporan' }}</small></div>
      <div class="p-2 text-xs"><b>03 Selesai editing</b><small class="mt-1.5 block text-muted">{{ production.editingCompletedAt ? formatDateTime(production.editingCompletedAt) : 'Belum selesai' }}</small></div>
      <div class="p-2 text-xs" :class="{ 'rounded-[7px] bg-green': production.submittedAt }"><b>04 Selesai</b><small class="mt-1.5 block text-muted">{{ production.submittedAt ? formatDateTime(production.submittedAt) : 'Menunggu pengumpulan manual' }}</small></div>
    </div>
    <div v-if="!production" class="panel empty-state">Produksi tidak ditemukan.</div>

    <form v-else class="grid grid-cols-1 gap-4.5" @submit.prevent="saveEditing">
      <section class="panel content-start">
        <h2>Laporan editing</h2>
        <p class="panel-subtitle">Catat progres, hasil editing, atau kendala pengerjaan.</p>
        <div class="grid gap-4.5">
          <label class="field">
            Pilih produksi *
            <select v-model="selectedId" required>
              <option v-for="item in demo.productions" :key="item.id" :value="item.id">{{ item.id }} · {{ item.title }}</option>
            </select>
          </label>
          <label class="field">
            Status editing *
            <select v-model="editorStatus" :disabled="isUploaded">
              <option>Proses editing</option>
              <option>Ada kendala</option>
              <option>Sudah selesai editing</option>
            </select>
          </label>
          <label class="field">Waktu selesai editing<input v-model="editingCompletedAt" type="datetime-local" :required="editorStatus === 'Sudah selesai editing'" :disabled="isUploaded" /></label>
          <label class="field">Laporan editing / kendala *<textarea v-model="editingReport" required :disabled="isUploaded" /></label>
        </div>
        <div class="mt-4.5 flex items-center justify-between gap-3.5 text-muted text-[11px] max-[560px]:flex-col max-[560px]:items-stretch">
          <span>Terakhir diperbarui: {{ formatDateTime(production.updatedAt) }}</span>
          <button v-if="!isUploaded" class="button button-primary" type="submit">Simpan pembaruan laporan</button>
        </div>
        <p v-if="saveMessage" class="mt-2 col-span-full text-xs text-[#27623b]" role="status">{{ saveMessage }}</p>
      </section>

      <section v-if="production.status === 'Sudah selesai editing'" class="panel col-span-full content-start">
        <h2>Selesai produksi</h2>
        <p class="panel-subtitle">Tandai produksi selesai setelah editing final. Upload file ke server dilakukan manual.</p>
        <button class="button button-primary" type="button" @click="finishProduction">Selesai produksi</button>
      </section>

      <section class="panel col-span-full content-start">
        <h3>Jejak aktivitas</h3>
        <div class="mt-4.5 grid grid-cols-4 gap-3.5 max-[760px]:grid-cols-2">
          <div class="grid gap-1.5 text-xs"><small class="text-[10px] text-muted">{{ formatDateTime(production.createdAt) }}</small><strong>Penugasan dibuat</strong><span class="text-[10px] text-muted">{{ production.pic }}</span></div>
          <div v-if="production.productionCompletedAt" class="grid gap-1.5 text-xs"><small class="text-[10px] text-muted">{{ formatDateTime(production.productionCompletedAt) }}</small><strong>Laporan produksi selesai</strong><span class="text-[10px] text-muted">{{ production.producer }}</span></div>
          <div v-if="production.editingCompletedAt" class="grid gap-1.5 text-xs"><small class="text-[10px] text-muted">{{ formatDateTime(production.editingCompletedAt) }}</small><strong>Editing selesai</strong><span class="text-[10px] text-muted">{{ production.editor }}</span></div>
          <div v-if="production.submittedAt" class="grid gap-1.5 text-xs"><small class="text-[10px] text-muted">{{ formatDateTime(production.submittedAt) }}</small><strong>File diunggah ke server</strong><span class="text-[10px] text-muted">{{ production.editor }}</span></div>
        </div>
      </section>
    </form>
  </section>
</template>

