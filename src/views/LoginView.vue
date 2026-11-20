<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authError, demoLogin, loadData, login, roleHome } from '../data.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const roles = [
  { role: 'pic', name: 'PIC', description: 'Monitoring & penugasan', color: 'role-green' },
  { role: 'producer', name: 'Produser', description: 'Laporan produksi', color: 'role-purple' },
  { role: 'nle', name: 'NLE', description: 'Editing & upload', color: 'role-blue' },
  { role: 'admin', name: 'Admin', description: 'Semua akses', color: 'role-orange' },
]

async function finishLogin(action) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const user = await action()
    await router.replace(roleHome(user.role))
    await loadData()
  } catch (error) {
    if (!authError.value && error instanceof Error) authError.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

function submitLogin() {
  return finishLogin(() => login(email.value, password.value))
}

function enterAsRole(role) {
  return finishLogin(() => demoLogin(role))
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-cream p-7.5 max-[620px]:px-4.5 max-[620px]:py-6">
    <div class="grid w-[min(100%,420px)] grid-cols-1 gap-5 rounded-xl bg-paper p-8 shadow-[0_12px_36px_rgb(38_32_23_/_8%)] max-[620px]:p-6">
      <div>
        <p class="m-0 text-[28px] tracking-[-0.035em]">TU DIGITAL</p>
        <p class="mb-7.5 mt-1 text-xs text-muted">Monitoring Produksi</p>
        <form class="grid gap-4.5" @submit.prevent="submitLogin">
          <div class="grid grid-cols-2 gap-2.5" aria-label="Masuk cepat berdasarkan role">
            <button
              v-for="role in roles"
              :key="role.role"
              class="grid min-h-[72px] cursor-pointer gap-1.5 rounded-[9px] border-0 p-3 text-left text-ink [&.role-green]:bg-green [&.role-purple]:bg-purple [&.role-blue]:bg-blue [&.role-orange]:bg-orange disabled:cursor-wait disabled:opacity-70"
              :class="role.color"
              type="button"
              :disabled="isSubmitting"
              @click="enterAsRole(role.role)"
            >
              <strong class="text-[13px] font-medium">{{ isSubmitting ? 'Memproses...' : ` ${role.name}` }}</strong>
              <small class="text-[10px]">{{ role.description }}</small>
            </button>
          </div>
          <p class="-mt-2.5 text-center text-[11px] text-muted">Login cepat hanya untuk demo.</p>
          <label class="field">Email<input v-model="email" type="email" autocomplete="username" required /></label>
          <label class="field">Password<input v-model="password" type="password" autocomplete="current-password" required /></label>
          <p v-if="authError" class="m-0 text-xs text-[#8d3023]" role="alert">{{ authError }}</p>
          <button class="button button-primary w-full" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Memeriksa...' : 'Masuk' }}
          </button>
        </form>
      </div>
    </div>
  </main>
</template>
