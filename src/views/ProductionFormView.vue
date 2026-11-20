<script setup>
import { reactive, computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createProduction, dateInputValue, loadAssignees } from '../data.js'

const router = useRouter()
const producers = ref([])
const form = reactive({
  producer: '',
  show: 'Ruang Kota',
  title: 'Ruang Kota: Mobilitas Masa Depan',
  productionDate: dateInputValue(1),
  airDate: dateInputValue(5),
})

onMounted(async () => {
  const assignees = await loadAssignees()
  producers.value = assignees.filter((assignee) => assignee.role === 'producer')
  if (!producers.value.some((producer) => producer.name === form.producer)) {
    form.producer = producers.value[0]?.name ?? ''
  }
})

const daysBetween = computed(() => {
  const production = new Date(`${form.productionDate}T00:00:00`)
  const airing = new Date(`${form.airDate}T00:00:00`)
  return Math.round((airing - production) / 86400000)
})

async function saveProduction() {
  await createProduction({
    title: form.title,
    show: form.show,
    producer: form.producer,
    productionDate: form.productionDate,
    airDate: form.airDate,
  })
  router.push('/input')
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <RouterLink class="back-link text-muted text-[13px]" to="/input">← Kembali</RouterLink>
        <h1 class="mt-4">Input data produksi</h1>
        <p>Susun jadwal dan kirim penugasan ke produser yang bertanggung jawab.</p>
      </div>
    </div>

    <form class="form-layout grid grid-cols-[minmax(0,1.8fr)_minmax(270px,0.9fr)] gap-4.5 max-[780px]:grid-cols-1" @submit.prevent="saveProduction">
      <section class="panel">
        <h2>Informasi produksi</h2>
        <p class="panel-subtitle">Semua kolom bertanda * wajib diisi.</p>
        <div class="form-fields grid gap-5">
          <label class="field">
            Nama produser *
            <select v-model="form.producer" required>
              <option v-for="producer in producers" :key="producer.name" :value="producer.name">{{ producer.name }}</option>
            </select>
          </label>
          <label class="field">
            Judul acara *
            <input v-model="form.show" required placeholder="Contoh: Ruang Kota" />
          </label>
          <label class="field">
            Judul produksi *
            <input v-model="form.title" required />
          </label>
          <div class="form-row grid grid-cols-2 gap-4.5 max-[560px]:grid-cols-1 max-[560px]:flex-col max-[560px]:items-stretch">
            <label class="field">Tanggal produksi *<input v-model="form.productionDate" type="date" required /></label>
            <label class="field">Tanggal rencana siar *<input v-model="form.airDate" type="date" required /></label>
          </div>
        </div>
        <div class="form-note mt-6.5 border-t border-line pt-4 text-xs text-muted">
          <p class="my-1.5Setelah dikirim, tugas akan masuk ke akun {{ form.producer }}.</p>
          <p class="my-[6px]>Status awal: <strong>Terjadwal</strong></p>
        </div>
      </section>

      <aside class="form-aside grid content-start gap-4.5">
        <section class="panel">
          <h2>Ringkasan penugasan</h2>
          <dl class="summary-list grid gap-5 my-5.5">
            <div><dt class="mb-1.25 text-[10px] uppercase text-muted">Produser</dt><dd class="m-0 text-sm">{{ form.producer }}</dd></div>
            <div><dt class="mb-1.25 text-[10px] uppercase text-muted">Jadwal produksi → siar</dt><dd class="m-0 text-sm">{{ form.productionDate }} → {{ form.airDate }}</dd></div>
          </dl>
          <div class="success-note p-2.5 rounded-md bg-green text-[11px]">{{ daysBetween }} hari antara produksi dan rencana siar</div>
        </section>
        <section class="panel">
          <h2>Bagaimana alurnya?</h2>
          <ol class="workflow-list grid gap-5 p-0 mt-5.5 list-none">
            <li class="grid grid-cols-[28px_1fr] gap-2.5 text-xs"><b>01</b><span><strong>PIC mengirim penugasan</strong><small class="block mt-1.25 text-muted text-[11px]">Data dan jadwal tercatat di sistem.</small></span></li>
            <li class="grid grid-cols-[28px_1fr] gap-2.5 text-xs"><b>02</b><span><strong>Produser melaporkan produksi</strong><small class="block mt-1.25 text-muted text-[11px]">Catat realisasi, kendala, lalu pilih NLE.</small></span></li>
            <li class="grid grid-cols-[28px_1fr] gap-2.5 text-xs"><b>03</b><span><strong>NLE menyelesaikan editing</strong><small class="block mt-1.25 text-muted text-[11px]">Progres dan kendala editing dipantau.</small></span></li>
            <li class="grid grid-cols-[28px_1fr] gap-2.5 text-xs"><b>04</b><span><strong>Hasil dikumpulkan ke server</strong><small class="block mt-1.25 text-muted text-[11px]">Status akhir: Selesai.</small></span></li>
          </ol>
        </section>
      </aside>

      <footer class="form-actions col-span-full flex items-center justify-between gap-4 rounded-[10px] bg-cream px-5 py-4 text-xs max-[560px]:grid-cols-1 max-[560px]:flex-col max-[560px]:items-stretch">
        <span>Periksa kembali tanggal sebelum mengirim.</span>
        <div class="button-group flex gap-2.5 max-[560px]:grid max-[560px]:grid-cols-[1fr_1.5fr]">
          <RouterLink class="button button-secondary" to="/input">Batal</RouterLink>
          <button class="button button-primary" type="submit">Simpan & tugaskan →</button>
        </div>
      </footer>
    </form>
  </section>
</template>
