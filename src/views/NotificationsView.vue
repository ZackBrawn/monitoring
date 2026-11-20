<script setup>
import { computed, ref } from 'vue'
import { demo, markNotificationRead, markNotificationsRead } from '../data.js'

const filter = ref('Semua')
const filters = ['Semua', 'Kendala', 'Upload', 'Penugasan']
const notifications = computed(() => filter.value === 'Semua'
  ? demo.notifications
  : demo.notifications.filter((item) => item.type === filter.value))

async function markAllRead() {
  await markNotificationsRead()
}

async function markRead(id) {
  await markNotificationRead(id)
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <h1>Notifikasi</h1>
        <p>Kabar terbaru dari seluruh alur produksi.</p>
      </div>
      <button class="button button-muted max-[560px]:w-full" type="button" @click="markAllRead">Tandai semua dibaca</button>
    </div>

    <div class="panel mb-5 flex gap-2 px-3.5 py-2.5">
      <button
        v-for="item in filters"
        :key="item"
        class="min-h-[42px] rounded-lg border-0 bg-transparent px-4 text-[13px]"
        :class="{ 'bg-orange': filter === item }"
        type="button"
        @click="filter = item"
      >
        {{ item }}
      </button>
    </div>

    <section class="panel">
      <h2 class="mb-4">Terbaru</h2>
      <div v-if="notifications.length" class="grid gap-2.5">
        <article v-for="item in notifications" :key="item.id" class="grid grid-cols-[12px_minmax(0,1fr)_minmax(100px,0.55fr)] items-start gap-3 rounded-lg border border-line p-3.75 text-xs max-[560px]:grid-cols-[12px_1fr]" :class="{ 'bg-[#fff8e8]': item.unread }">
          <i class="mt-1 h-[11px] w-[11px] rounded-full" :class="item.type === 'Kendala' ? 'bg-yellow' : item.type === 'Upload' ? 'bg-green' : 'bg-purple'" />
          <div>
            <strong>{{ item.title }}</strong>
            <p class="mt-1.25 text-[11px] text-muted">{{ item.description }}</p>
          </div>
          <div class="grid content-start justify-items-end gap-2 max-[560px]:grid-flow-col max-[560px]:items-center max-[560px]:justify-items-start max-[560px]:col-start-2">
            <time class="text-[10px] text-muted">{{ item.time }}</time>
            <button v-if="item.unread" class="min-h-[42px] whitespace-nowrap rounded-lg border border-line bg-paper px-4 text-[13px] font-semibold text-muted transition-[background,border-color,color] duration-[120ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-[#eac98f] hover:bg-orange hover:text-ink" type="button" @click="markRead(item.id)">Sudah dibaca</button>
          </div>
        </article>
      </div>
      <p v-else class="empty-state">Belum ada notifikasi pada kategori ini.</p>
    </section>
  </section>
</template>
