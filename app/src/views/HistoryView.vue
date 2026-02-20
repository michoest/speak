<template>
  <v-container class="pa-4 pb-24" style="max-width: 640px">
    <div class="text-h6 font-weight-bold mb-6" style="color: #22d3ee">History</div>

    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="sessions.length === 0" class="text-center py-12 text-medium-emphasis">
      No sessions yet. Start practicing!
    </div>

    <v-list v-else lines="two" class="rounded-lg" bg-color="surface">
      <v-list-item
        v-for="s in sessions"
        :key="s.id"
        :title="sessionTitle(s)"
        :subtitle="sessionSubtitle(s)"
        class="mb-1"
      >
        <template #prepend>
          <v-avatar :color="s.mode === 'drill' ? 'primary' : 'secondary'" variant="tonal" size="40">
            <v-icon>{{ s.mode === 'drill' ? 'mdi-repeat' : 'mdi-forum' }}</v-icon>
          </v-avatar>
        </template>
        <template #append>
          <div class="text-right">
            <v-chip v-if="s.avg_score" :color="scoreColor(s.avg_score)" variant="tonal" size="x-small" class="mb-1">
              {{ Math.round(s.avg_score) }}%
            </v-chip>
            <div class="text-caption text-medium-emphasis">{{ s.sentence_count }} turns</div>
          </div>
        </template>
      </v-list-item>
    </v-list>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/services/api.js'
import { formatDistanceToNow } from 'date-fns'

const sessions = ref([])
const loading = ref(true)

const LANGS = [
  { code: 'de', nativeName: 'Deutsch' }, { code: 'fr', nativeName: 'Français' },
  { code: 'es', nativeName: 'Español' }, { code: 'en', nativeName: 'English' },
]

onMounted(async () => {
  try {
    sessions.value = await api.get('/api/history')
  } finally {
    loading.value = false
  }
})

function scoreColor(s) {
  if (s >= 80) return 'success'
  if (s >= 55) return 'warning'
  return 'error'
}

function sessionTitle(s) {
  const l = LANGS.find(x => x.code === s.language)?.nativeName || s.language
  return `${l} · ${s.mode === 'drill' ? (s.topic || 'Drill') : 'Conversation'}`
}

function sessionSubtitle(s) {
  const ago = formatDistanceToNow(new Date(s.completed_at * 1000), { addSuffix: true })
  return ago
}
</script>

<style scoped>
.pb-24 { padding-bottom: 96px }
</style>
