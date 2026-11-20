<script setup>
import { onMounted, reactive, ref } from 'vue'
import { changeUserRole, createUser, currentUser, listUsers } from '../data.js'

const users = ref([])
const roleDrafts = reactive({})
const loading = ref(true)
const submitting = ref(false)
const savingRoleId = ref(null)
const pageError = ref('')
const successMessage = ref('')
const roleLabels = {
  pic: 'PIC',
  producer: 'Produser',
  nle: 'NLE',
  admin: 'Admin',
}
const form = reactive({
  name: '',
  email: '',
  role: 'producer',
  password: '',
})

async function refreshUsers() {
  users.value = await listUsers()
  for (const user of users.value) roleDrafts[user.id] = user.role
}

onMounted(async () => {
  try {
    await refreshUsers()
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Daftar pengguna gagal dimuat.'
  } finally {
    loading.value = false
  }
})

async function submitUser() {
  if (submitting.value) return
  submitting.value = true
  pageError.value = ''
  successMessage.value = ''
  try {
    await createUser(form)
    await refreshUsers()
    successMessage.value = `Akun ${form.email} berhasil dibuat.`
    form.name = ''
    form.email = ''
    form.role = 'producer'
    form.password = ''
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Akun gagal dibuat.'
  } finally {
    submitting.value = false
  }
}

async function saveRole(user) {
  const nextRole = roleDrafts[user.id]
  if (!nextRole || nextRole === user.role || savingRoleId.value !== null) return
  savingRoleId.value = user.id
  pageError.value = ''
  successMessage.value = ''
  try {
    await changeUserRole(user.id, nextRole)
    await refreshUsers()
    successMessage.value = `Role ${user.name} berhasil diubah menjadi ${roleLabels[nextRole]}.`
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : 'Role pengguna gagal diubah.'
    roleDrafts[user.id] = user.role
  } finally {
    savingRoleId.value = null
  }
}
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>Manajemen pengguna</h1>
        <p>Buat akun PIC, Produser, NLE, atau Admin. Password disimpan sebagai hash.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
      <form class="panel grid content-start gap-5" @submit.prevent="submitUser">
        <div>
          <h2>Tambah user baru</h2>
          <p class="panel-subtitle">Akun dapat digunakan untuk masuk setelah berhasil dibuat.</p>
        </div>
        <label class="field">
          Nama lengkap *
          <input v-model.trim="form.name" maxlength="100" autocomplete="name" required />
        </label>
        <label class="field">
          Email *
          <input v-model.trim="form.email" type="email" maxlength="254" autocomplete="email" required />
        </label>
        <label class="field">
          Role *
          <select v-model="form.role" required>
            <option value="pic">PIC</option>
            <option value="producer">Produser</option>
            <option value="nle">NLE</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label class="field">
          Password awal *
          <input
            v-model="form.password"
            type="password"
            minlength="12"
            maxlength="128"
            autocomplete="new-password"
            required
          />
          <small class="text-xs text-stone-600">Minimal 12 karakter. Sampaikan password awal kepada pemilik akun dengan aman.</small>
        </label>
        <p v-if="pageError" class="m-0 text-xs text-[#8d3023]" role="alert">{{ pageError }}</p>
        <p v-if="successMessage" class="m-0 text-xs text-[#27623b]" role="status">{{ successMessage }}</p>
        <button class="button button-primary w-full" type="submit" :disabled="submitting">
          {{ submitting ? 'Membuat akun...' : 'Buat akun' }}
        </button>
      </form>

      <section class="panel">
        <div class="mb-5">
          <h2>Daftar pengguna</h2>
          <p class="panel-subtitle">Informasi password tidak ditampilkan. Role akun Admin yang sedang digunakan tidak dapat diubah dari halaman ini.</p>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="title-cell">{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <select
                    v-model="roleDrafts[user.id]"
                    class="filter-control min-w-28.75 p-2"
                    :disabled="!user.isActive || String(currentUser?.id) === String(user.id) || savingRoleId !== null"
                    :aria-label="`Role ${user.name}`"
                  >
                    <option value="pic">PIC</option>
                    <option value="producer">Produser</option>
                    <option value="nle">NLE</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <span class="status" :class="user.isActive ? 'status-green' : 'status-yellow'">
                    {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td>
                  <button
                    class="link-button"
                    type="button"
                    :disabled="roleDrafts[user.id] === user.role || !user.isActive || String(currentUser?.id) === String(user.id) || savingRoleId !== null"
                    @click="saveRole(user)"
                  >
                    {{ savingRoleId === user.id ? 'Menyimpan...' : 'Simpan role' }}
                  </button>
                </td>
              </tr>
              <tr v-if="loading || users.length === 0">
                <td colspan="5" class="empty-state">
                  {{ loading ? 'Memuat pengguna...' : 'Belum ada pengguna.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

