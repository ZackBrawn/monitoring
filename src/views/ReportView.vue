<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dateTimeInputValue, demo, formatDate, formatDateTime, loadAssignees, updateProduction } from '../data.js'

const router = useRouter()
const route = useRoute()
const productionId = ref(typeof route.params.id === 'string' ? route.params.id : '')
const completed = ref(true)
const report = ref('')
const productionCompletedAt = ref(dateTimeInputValue())
const editors = ref([])
const editor = ref('')

onMounted(async () => {
  const assignees = await loadAssignees()
  editors.value = assignees.filter((assignee) => assignee.role === 'nle')
  if (!editors.value.some((item) => item.name === editor.value)) {
    editor.value = editors.value[0]?.name ?? ''
  }
})

const production = computed(() => demo.productions.find((item) => item.id === productionId.value))
const activityEntries = computed(() => {
  if (!production.value) return []
  const entries = [{
    time: production.value.createdAt,
    title: 'Penugasan dibuat',
  }]
  if (production.value.updatedAt && production.value.updatedAt !== production.value.createdAt) {
    entries.push({
      time: production.value.updatedAt,
      title: 'Data produksi diperbarui',
    })
  }
  return entries.filter((entry) => entry.time)
})

watch(production, (item) => {
  if (!item) return
  completed.value = item.status !== 'Kendala produksi'
  report.value = item.productionReport || item.issue || ''
  productionCompletedAt.value = dateTimeInputValue(item.productionCompletedAt || new Date())
  editor.value = item.editor === 'Belum ditugaskan' ? (editors.value[0]?.name ?? '') : item.editor
}, { immediate: true })

watch(() => route.params.id, (id) => {
  if (typeof id === 'string' && id !== productionId.value) productionId.value = id
})

watch(productionId, (id) => {
  if (id && route.params.id !== id) router.replace(`/report/${id}`)
})

async function saveReport() {
  if (!production.value) return
  const changes = {
    status: completed.value ? 'Proses editing' : 'Kendala produksi',
    issue: completed.value ? '' : report.value,
    productionReport: report.value,
    productionCompletedAt: completed.value ? productionCompletedAt.value : '',
  }
  if (completed.value) changes.editor = editor.value
  await updateProduction(production.value.id, changes)
  router.push(`/detail/${production.value.id}`)
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <RouterLink class="back-link text-muted text-[13px]" to="/report">← Kembali ke antrean laporan</RouterLink>
        <h1 class="mt-4">{{ production?.title || 'Laporan realisasi produksi' }}</h1>
        <p>{{ production?.id }} · {{ production?.show }} · Produser: {{ production?.producer }}</p>
      </div>
    </div>

    <div v-if="production" class="stage-strip grid grid-cols-4 gap-2 p-3.5 mb-5 rounded-[10px] bg-cream max-[760px]:grid-cols-2">
      <div class="stage-item p-2 text-xs"><b>01 Penugasan PIC</b><small class="block mt-1.5 text-muted">{{ formatDateTime(production.createdAt) }}</small></div>
      <div class="stage-item stage-current p-2 text-xs rounded-[7px] bg-green"><b>02 Laporan produksi</b><small class="block mt-1.5 text-muted">{{ production.productionCompletedAt ? formatDateTime(production.productionCompletedAt) : 'Menunggu laporan' }}</small></div>
      <div class="stage-item p-2 text-xs"><b>03 Proses editing</b><small class="block mt-1.5 text-muted">{{ production.editingCompletedAt ? formatDateTime(production.editingCompletedAt) : 'Menunggu NLE' }}</small></div>
      <div class="stage-item p-2 text-xs"><b>04 Selesai</b><small class="block mt-1.5 text-muted">{{ production.submittedAt ? formatDateTime(production.submittedAt) : 'Menunggu upload' }}</small></div>
    </div>

    <div v-if="!production" class="panel empty-state">Produksi tidak ditemukan.</div>
    <div v-else class="report-layout grid grid-cols-1 gap-4.5">
      <form class="panel report-form grid content-start gap-4.5" @submit.prevent="saveReport">
        <h2>Laporan realisasi produksi</h2>
        <p class="panel-subtitle">Perbarui hasil produksi sebelum diteruskan ke NLE.</p>
        <label class="field">
          Pilih produksi *
          <select v-model="productionId" required>
            <option v-for="item in demo.productions" :key="item.id" :value="item.id">{{ item.id }} · {{ item.title }}</option>
          </select>
        </label>
        <div class="field">
          Status pelaksanaan *
          <div class="choice-row flex flex-wrap gap-3">
            <label class="choice-card flex min-w-60 flex-1 items-center justify-start gap-2 rounded-[7px] border border-line bg-paper p-3" :class="{ 'choice-selected border-[#82c895]! bg-green!': completed }">
              <input v-model="completed" :value="true" type="radio" name="completion" class="h-3.5 w-3.5 min-h-0 shrink-0 p-0" />
              <span class="text-[12px]">Sudah terlaksana</span>
            </label>
            <label class="choice-card flex min-w-60 flex-1 items-center justify-start gap-2 rounded-[7px] border border-line bg-paper p-3" :class="{ 'choice-selected border-[#82c895]! bg-green!': !completed }">
              <input v-model="completed" :value="false" type="radio" name="completion" class="h-3.5 w-3.5 min-h-0 shrink-0 p-0" />
              <span class="text-[12px]">Belum terlaksana / ada kendala</span>
            </label>
          </div>
        </div>
        <label class="field">Waktu selesai produksi *<input v-model="productionCompletedAt" type="datetime-local" :required="completed" /></label>
        <label class="field">Laporan produksi / kendala *<textarea v-model="report" required /></label>
        <label v-if="completed" class="field">
          Teruskan ke NLE *
          <select v-model="editor" required>
            <option v-for="item in editors" :key="item.name" :value="item.name">{{ item.name }}</option>
          </select>
        </label>
        <p class="form-help -mt-1 text-muted text-[11px]">
          {{ completed ? 'Laporan dan waktu selesai akan diteruskan ke NLE yang dipilih.' : 'Catat kendala terlebih dahulu. Penugasan NLE dilakukan setelah produksi terlaksana.' }}
        </p>
        <div class="report-actions flex justify-end gap-2.5 max-[520px]:flex-col">
          <button class="button button-primary max-[520px]:w-full" type="submit">
            {{ completed ? 'Simpan & teruskan ke NLE →' : 'Simpan laporan kendala' }}
          </button>
        </div>
      </form>

      <aside class="report-aside grid content-start gap-4.5 grid-cols-2 max-[760px]:grid-cols-1">
        <section class="panel">
          <h2>Informasi produksi</h2>
          <dl class="summary-list grid gap-4.5 mt-5">
            <div><dt class="text-muted text-[10px] uppercase">Tanggal produksi</dt><dd class="mt-1.25 text-[13px]">{{ formatDate(production.productionDate) }}</dd></div>
            <div><dt class="text-muted text-[10px] uppercase">Rencana siar</dt><dd class="mt-1.25 text-[13px]">{{ formatDate(production.airDate) }}</dd></div>
            <div><dt class="text-muted text-[10px] uppercase">PIC penugasan</dt><dd class="mt-1.25 text-[13px]">{{ production.pic }}</dd></div>
          </dl>
        </section>
        <section class="panel">
          <h2>Riwayat aktivitas</h2>
          <p class="panel-subtitle">Tercatat otomatis pada setiap pembaruan.</p>
          <ol class="activity-list grid gap-4.5 py-0 pr-0 pl-4.5 mt-5">
            <li v-for="entry in activityEntries" :key="`${entry.title}-${entry.time}`" class="pl-1.25 text-xs">
              <time class="block mb-1.25 text-muted text-[11px]">{{ formatDateTime(entry.time) }}</time>
              <strong class="block mb-1.25">{{ entry.title }}</strong>
              <span class="block mb-1.25 text-muted text-[11px]">{{ production.producer }}</span>
            </li>
          </ol>
        </section>
      </aside>
    </div>
  </section>
</template>
