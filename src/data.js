import { reactive, ref } from 'vue'

export const demo = reactive({
  productions: [],
  notifications: [],
})

export const apiError = ref('')
export const authError = ref('')
export const currentUser = ref(null)

export function roleHome(role) {
  if (role === 'producer') return '/report'
  if (role === 'nle') return '/editing'
  return '/'
}

async function request(path, options = {}) {
  try {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    const result = await response.json().catch(() => ({}))
    if (response.status === 401 && path !== '/api/auth/login') currentUser.value = null
    if (!response.ok) throw new Error(result.error || `Permintaan gagal (${response.status}).`)
    return result
  } catch (error) {
    if (!options.silent) {
      apiError.value = error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.'
    }
    throw error
  }
}

export async function restoreSession() {
  try {
    const response = await fetch('/api/auth/me')
    if (response.status === 401) {
      currentUser.value = null
      return null
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `Permintaan gagal (${response.status}).`)
    currentUser.value = result
    return result
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : 'Tidak dapat memeriksa sesi login.'
    throw error
  }
}

export async function login(email, password) {
  authError.value = ''
  try {
    const user = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    currentUser.value = user
    apiError.value = ''
    return user
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Tidak dapat masuk.'
    throw error
  }
}

export async function demoLogin(role) {
  authError.value = ''
  try {
    const user = await request('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
    currentUser.value = user
    apiError.value = ''
    return user
  } catch (error) {
    authError.value = error instanceof Error ? error.message : 'Login cepat tidak berhasil.'
    throw error
  }
}

export async function logout() {
  await request('/api/auth/logout', { method: 'POST' })
  currentUser.value = null
  demo.productions.splice(0)
  demo.notifications.splice(0)
  apiError.value = ''
}

export async function loadData(silent = false) {
  const [productions, notifications] = await Promise.all([
    request('/api/productions', { silent }),
    request('/api/notifications', { silent }),
  ])
  demo.productions.splice(0, demo.productions.length, ...productions)
  demo.notifications.splice(0, demo.notifications.length, ...notifications)
  apiError.value = ''
}

let liveTimer = null
let liveInFlight = false


export function startLiveUpdates(intervalMs = 15000) {
  if (liveTimer) return
  liveTimer = setInterval(async () => {
    if (!currentUser.value || document.hidden || liveInFlight) return
    liveInFlight = true
    try {
      await loadData(true)
    } catch {
    } finally {
      liveInFlight = false
    }
  }, intervalMs)
}

export async function createProduction(production) {
  await request('/api/productions', {
    method: 'POST',
    body: JSON.stringify(production),
  })
  await loadData()
}

export async function updateProduction(id, changes) {
  await request(`/api/productions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
  await loadData()
}

export async function completeProduction(id) {
  await request(`/api/productions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'Produksi selesai' }),
  })
  await loadData()
}

export async function markNotificationsRead() {
  await request('/api/notifications/read-all', { method: 'PATCH' })
  await loadData()
}

export async function markNotificationRead(id) {
  await request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
  await loadData()
}

export async function listUsers() {
  return request('/api/users')
}

export async function createUser(user) {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  })
}

export async function changeUserRole(id, role) {
  return request(`/api/users/${encodeURIComponent(id)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export async function loadAssignees() {
  return request('/api/assignees')
}

export const statusClasses = {
  Terjadwal: 'status-purple',
  'Proses editing': 'status-blue',
  'Kendala produksi': 'status-yellow',
  'Kendala editing': 'status-yellow',
  'Sudah selesai editing': 'status-orange',
  'Produksi selesai': 'status-green',
}

export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function currentMonth() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function dateInputValue(daysFromToday = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dateTimeInputValue(value = new Date()) {
  const date = typeof value === 'string'
    ? new Date(value.replace(' ', 'T'))
    : value
  if (Number.isNaN(date.valueOf())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export function formatDateTime(date) {
  if (!date) return '—'
  const parsed = date instanceof Date ? date : new Date(date.replace(' ', 'T'))
  if (Number.isNaN(parsed.valueOf())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

