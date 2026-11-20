<script setup>
import { computed, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { apiError, currentUser, demo, loadData, logout } from './data.js'

const route = useRoute()
const router = useRouter()
const isLogin = computed(() => route.path === '/login')

const roleLabels = { pic: 'PIC', producer: 'Produser', nle: 'NLE', admin: 'Admin' }
const navByRole = {
  pic: [
    { label: 'Monitoring', path: '/' },
    { label: 'Input produksi', path: '/input' },
    { label: 'Kalender', path: '/calendar' },
    { label: 'Laporan', path: '/stats' },
    { label: 'Notifikasi', path: '/notifications' },
  ],
  producer: [
    { label: 'Laporan produksi', path: '/report' },
    { label: 'Notifikasi', path: '/notifications' },
  ],
  nle: [
    { label: 'Editing & server', path: '/editing' },
    { label: 'Notifikasi', path: '/notifications' },
  ],
  admin: [
    { label: 'Monitoring', path: '/' },
    { label: 'Input produksi', path: '/input' },
    { label: 'Laporan produksi', path: '/report' },
    { label: 'Editing & server', path: '/editing' },
    { label: 'Kalender', path: '/calendar' },
    { label: 'Laporan', path: '/stats' },
    { label: 'Notifikasi', path: '/notifications' },
    { label: 'Manajemen pengguna', path: '/admin/users' },
  ],
}
const navItems = computed(() => navByRole[currentUser.value?.role] || [])
const unreadCount = computed(() => demo.notifications.filter((item) => item.unread).length)

watch(currentUser, (user) => {
  if (!user && route.path !== '/login') router.replace('/login')
})

function isActive(item) {
  if (item.path === '/') return route.path === '/'
  return route.path.startsWith(item.path.split('/').slice(0, 2).join('/'))
}

async function signOut() {
  await logout()
  await router.replace('/login')
}
</script>

<template>
  <RouterView v-if="isLogin" />
  <div v-else class="app-shell">
    <div v-if="apiError" class="fixed z-50 right-4 bottom-4 flex max-w-[min(560px,calc(100vw-32px))] items-center gap-4 rounded-lg border border-[#d88b72] bg-[#fff1e9] px-4 py-3 text-[13px] text-[#693b2c]" role="alert">
      <span>{{ apiError }}</span>
      <button type="button" @click="loadData" class="shrink-0 border-0 bg-transparent font-semibold text-inherit underline">Coba lagi</button>
    </div>
    <aside class="sidebar">
      <RouterLink class="brand" to="/" aria-label="TU Digital, monitoring produksi">
        <strong>TU DIGITAL</strong>
        <span>Monitoring Produksi</span>
      </RouterLink>
      <nav class="side-nav" aria-label="Navigasi utama">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.path"
          class="nav-link flex items-center justify-between gap-2.5"
          :class="{ 'nav-link-active': isActive(item) }"
        >
          <span>{{ item.label }}</span>
          <span v-if="item.path === '/notifications' && unreadCount" class="inline-block min-w-4.75 rounded-full bg-ink px-1.5 py-0.5 text-center text-[10px] font-bold leading-[1.4] text-paper">{{ unreadCount }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div class="breadcrumbs">
          <span>Workspace</span>
          <span aria-hidden="true">/</span>
          <span>{{ route.name || 'Monitoring' }}</span>
        </div>
        <div class="profile-actions">
          <div class="profile-chip">
            <span>{{ currentUser?.name }}</span>
            <small>{{ roleLabels[currentUser?.role] }}</small>
          </div>
          <button class="topbar-logout" type="button" @click="signOut">Keluar</button>
        </div>
      </header>
      <nav class="mobile-nav" aria-label="Navigasi mobile">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.path"
          class="mobile-nav-link flex items-center justify-between gap-2.5"
          :class="{ 'mobile-nav-link-active': isActive(item) }"
        >
          <span>{{ item.label }}</span>
          <span v-if="item.path === '/notifications' && unreadCount" class="inline-block min-w-4.75 rounded-full bg-ink px-1.5 py-0.5 text-center text-[10px] font-bold leading-[1.4] text-paper">{{ unreadCount }}</span>
        </RouterLink>
      </nav>
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
