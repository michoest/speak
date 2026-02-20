<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="360" class="pa-4">
      <div class="text-center mb-6">
        <img src="/icons/icon-192.png" alt="Speak" width="56" height="56" class="mb-2" />
        <div class="text-h5 font-weight-bold" style="color: #22d3ee">Speak</div>
        <div class="text-body-2 text-medium-emphasis">Sign in to continue</div>
      </div>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          autocomplete="email"
          prepend-inner-icon="mdi-email-outline"
          class="mb-2"
          :disabled="loading"
        />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          class="mb-4"
          :disabled="loading"
        />

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4" density="compact">
          {{ error }}
        </v-alert>

        <v-btn type="submit" color="primary" block size="large" :loading="loading">
          Sign In
        </v-btn>
      </v-form>

      <div class="text-center mt-4">
        <span class="text-body-2 text-medium-emphasis">No account? </span>
        <router-link to="/register" class="text-primary">Create one</router-link>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
