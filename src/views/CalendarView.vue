<script setup>
import { computed, ref } from 'vue'
import { currentMonth, demo, formatDate, statusClasses } from '../data.js'

const month = ref(new Date(`${currentMonth()}-01T00:00:00`))
const productionsThisMonth = computed(() => demo.productions.filter((item) => {
  return item.productionDate.startsWith(`${month.value.getFullYear()}-${String(month.value.getMonth() + 1).padStart(2, '0')}`)
}))
const issuesThisMonth = computed(() => productionsThisMonth.value.filter((item) => ['Kendala produksi', 'Kendala editing'].includes(item.status)).length)
const monthLabel = computed(() => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month.value))
const calendarCells = computed(() => {
  const year = month.value.getFullYear()
  const monthIndex = month.value.getMonth()
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)
  return cells
})

const entriesByDay = computed(() => {
  const entries = new Map()
  for (const production of demo.productions) {
    const date = new Date(`${production.productionDate}T00:00:00`)
    if (date.getFullYear() === month.value.getFullYear() && date.getMonth() === month.value.getMonth()) {
      const day = date.getDate()
      if (!entries.has(day)) entries.set(day, [])
      entries.get(day).push({ production, kind: 'Produksi' })
    }
    const airDate = new Date(`${production.airDate}T00:00:00`)
    if (airDate.getFullYear() === month.value.getFullYear() && airDate.getMonth() === month.value.getMonth()) {
      const day = airDate.getDate()
      if (!entries.has(day)) entries.set(day, [])
      entries.get(day).push({ production, kind: 'Siar' })
    }
  }
  return entries
})

function changeMonth(offset) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1)
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <h1>Kalender produksi</h1>
        <p>Jadwal produksi dan rencana siar dalam satu tampilan.</p>
      </div>
    </div>

    <div class="panel mb-4.5 flex items-center justify-between gap-5 px-5 py-3.5 max-[620px]:flex-col max-[620px]:items-start">
      <div class="flex items-center gap-4">
        <button class="h-10.5 w-10.5 rounded-lg border-0 bg-transparent text-[22px] hover:bg-orange" type="button" aria-label="Bulan sebelumnya" @click="changeMonth(-1)">‹</button>
        <strong class="min-w-37.5 text-[15px] font-medium capitalize">{{ monthLabel }}</strong>
        <button class="h-10.5 w-10.5 rounded-lg border-0 bg-transparent text-[22px] hover:bg-orange" type="button" aria-label="Bulan berikutnya" @click="changeMonth(1)">›</button>
      </div>
      <div class="flex flex-wrap gap-5 text-[11px]">
        <span class="inline-flex items-center gap-1.75"><i class="h-2.5 w-2.5 rounded-full bg-orange" />Produksi</span>
        <span class="inline-flex items-center gap-1.75"><i class="h-2.5 w-2.5 rounded-full bg-green" />Siar</span>
        <span class="inline-flex items-center gap-1.75"><i class="h-2.5 w-2.5 rounded-full bg-yellow" />Kendala</span>
      </div>
    </div>

    <div class="panel grid grid-cols-7 gap-1 p-3 max-[620px]:gap-0.5 max-[620px]:p-1.75">
      <div v-for="weekday in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="weekday" class="px-2 pb-2 pt-1 text-center text-[11px] text-muted">{{ weekday }}</div>
      <div v-for="(day, index) in calendarCells" :key="`${month.getMonth()}-${index}`" class="min-h-23.75rounded border border-line p-1.75 text-[11px] max-[620px]:min-h-19.5 max-[620px]:p-1" :class="{ 'border-transparent! bg-[#fffaf04d]': !day }">
        <template v-if="day">
          <span class="mb-1.75 block">{{ day }}</span>
          <RouterLink
            v-for="entry in (entriesByDay.get(day) || []).slice(0, 2)"
            :key="`${entry.kind}-${entry.production.id}`"
            class="mt-1 block overflow-hidden whitespace-nowrap rounded-xl px-1.5 py-1 text-ellipsis text-[9px] max-[620px]:p-0.75 max-[620px]:text-[8px]"
            :class="entry.kind === 'Siar' ? 'bg-green' : statusClasses[entry.production.status]"
            :to="`/detail/${entry.production.id}`"
            :title="`${entry.kind}: ${entry.production.title} (${formatDate(entry.production.productionDate)})`"
          >
            {{ entry.kind === 'Siar' ? 'Siar' : entry.production.show }} {{ entry.production.id.slice(-3) }}
          </RouterLink>
        </template>
      </div>
    </div>

    <div class="panel mt-4.5">
      <h2 class="text-sm">Agenda bulan ini</h2>
      <div class="mt-4.5 flex justify-between gap-3 text-xs max-[620px]:flex-col max-[620px]:items-start">
        <span class="inline-flex items-center gap-1.75"><i class="h-2.5 w-2.5 rounded-full bg-orange" />{{ productionsThisMonth.length }} produksi bulan ini</span>
        <span class="inline-flex items-center gap-1.75"><i class="h-2.5[10px] rounded-full bg-green" />Jadwal siar ditampilkan</span>
        <span class="inline-flex items-center gap-1.75"><i class="h-2.5 w-2.5 rounded-full bg-yellow" />{{ issuesThisMonth }} kendala ditindaklanjuti</span>
      </div>
    </div>
  </section>
</template>
