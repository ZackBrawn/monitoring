import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { currentUser, loadData, restoreSession, roleHome, startLiveUpdates } from './data.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('./views/LoginView.vue'), meta: { guest: true } },
    { path: '/', name: 'Monitoring', component: () => import('./views/DashboardView.vue'), meta: { roles: ['pic', 'admin'] } },
    { path: '/input', name: 'Input data produksi', component: () => import('./views/ProductionAssignmentsView.vue'), meta: { roles: ['pic', 'admin'] } },
    { path: '/input/new', name: 'Input produksi baru', component: () => import('./views/ProductionFormView.vue'), meta: { roles: ['pic', 'admin'] } },
    { path: '/report', name: 'Laporan produksi', component: () => import('./views/ProductionReportsView.vue'), meta: { roles: ['pic', 'producer', 'admin'] } },
    { path: '/report/:id', name: 'Form laporan produksi', component: () => import('./views/ReportView.vue'), meta: { roles: ['producer', 'admin'] } },
    { path: '/editing', name: 'Antrean editing', component: () => import('./views/EditingQueueView.vue'), meta: { roles: ['pic', 'nle', 'admin'] } },
    { path: '/editing/:id', name: 'Editing & server', component: () => import('./views/EditingView.vue'), meta: { roles: ['nle', 'admin'] } },
    { path: '/detail/:id', name: 'Detail produksi', component: () => import('./views/DetailView.vue'), meta: { roles: ['pic', 'producer', 'nle', 'admin'] } },
    { path: '/calendar', name: 'Kalender', component: () => import('./views/CalendarView.vue'), meta: { roles: ['pic', 'admin'] } },
    { path: '/stats', name: 'Laporan & statistik', component: () => import('./views/StatsView.vue'), meta: { roles: ['pic', 'admin'] } },
    { path: '/notifications', name: 'Notifikasi', component: () => import('./views/NotificationsView.vue'), meta: { roles: ['pic', 'producer', 'nle', 'admin'] } },
    { path: '/admin/users', name: 'Manajemen pengguna', component: () => import('./views/UserManagementView.vue'), meta: { roles: ['admin'] } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const user = currentUser.value
  if (to.meta.guest) return user ? roleHome(user.role) : true
  if (!user) return { name: 'Login' }
  if (to.meta.roles && !to.meta.roles.includes(user.role)) return roleHome(user.role)
  return true
})

const APP_TITLE = 'Monitoring Produksi | TU Digital'
router.afterEach((to) => {
  document.title = to.name ? `${String(to.name)} · Monitoring TU Digital` : APP_TITLE
})

async function start() {
  try {
    await restoreSession()
    if (currentUser.value) await loadData()
  } catch (error) {
    console.error('Gagal memulihkan sesi atau memuat data dari API:', error)
  }

  createApp(App).use(router).mount('#app')
  startLiveUpdates()
}

start()
