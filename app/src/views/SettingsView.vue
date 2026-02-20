<template>
  <v-container class="pa-4" style="max-width: 600px">
    <div class="text-h6 font-weight-bold mb-6" style="color: #22d3ee">Settings</div>

    <v-card class="mb-4 pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-3">PRACTICE LANGUAGE</div>
      <v-btn-toggle v-model="settings.language" mandatory color="primary" class="flex-wrap" style="gap: 8px">
        <v-btn v-for="lang in settings.LANGS" :key="lang.code" :value="lang.code" variant="tonal" size="small">
          {{ lang.flag }} {{ lang.nativeName }}
        </v-btn>
      </v-btn-toggle>
    </v-card>

    <v-card class="mb-4 pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-3">AI MODEL</div>
      <v-select v-model="settings.model" :items="settings.MODELS" item-title="label" item-value="id" />
    </v-card>

    <v-card class="mb-4 pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-3">TTS VOICE</div>
      <v-select v-model="settings.voice" :items="settings.VOICES" item-title="label" item-value="id" />
    </v-card>

    <v-card class="mb-4 pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-2">PLAYBACK SPEED</div>
      <v-slider v-model="settings.ttsSpeed" :min="0.5" :max="1.5" :step="0.25" thumb-label color="primary" track-color="surface-variant">
        <template #thumb-label="{ modelValue }">{{ modelValue }}x</template>
      </v-slider>
    </v-card>

    <v-card class="mb-4 pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-2">DRILL SENTENCES PER SESSION</div>
      <v-slider v-model="settings.drillCount" :min="4" :max="15" :step="1" thumb-label color="primary" track-color="surface-variant" />
    </v-card>

    <v-card class="pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-3">ACCOUNT</div>
      <div class="text-body-2 mb-3">{{ auth.user?.email }}</div>
      <v-btn color="error" variant="tonal" @click="logout">Sign Out</v-btn>
    </v-card>
  </v-container>
</template>

<script setup>
import { useSettingsStore } from '@/stores/settings.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'

const settings = useSettingsStore()
const auth = useAuthStore()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>
