import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/services/api.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref(null)

  const isLoggedIn = computed(() => !!user.value)

  async function checkAuth() {
    try {
      const data = await api.get('/auth/me')
      user.value = data
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const data = await api.post('/auth/login', { email, password })
      user.value = data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(email, password) {
    loading.value = true
    error.value = null
    try {
      const data = await api.post('/auth/register', { email, password })
      user.value = data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await api.post('/auth/logout')
    user.value = null
  }

  return { user, initialized, loading, error, isLoggedIn, checkAuth, login, register, logout }
})
