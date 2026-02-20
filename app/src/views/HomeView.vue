<template>
  <v-container class="pa-4 pb-24" style="max-width: 640px">

    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <div class="text-h5 font-weight-bold" style="color: #22d3ee">Speak</div>
        <div class="text-body-2 text-medium-emphasis">{{ greeting }}</div>
      </div>
      <!-- Streak chip -->
      <v-chip color="warning" variant="tonal" prepend-icon="mdi-fire">
        {{ streak }} day{{ streak !== 1 ? 's' : '' }}
      </v-chip>
    </div>

    <!-- Language selector -->
    <v-card class="mb-4 pa-4">
      <div class="text-subtitle-2 text-medium-emphasis mb-3">PRACTICING</div>
      <v-btn-toggle v-model="settings.language" mandatory color="primary" class="flex-wrap" style="gap: 8px">
        <v-btn v-for="lang in settings.LANGS" :key="lang.code" :value="lang.code" variant="tonal" size="small">
          {{ lang.flag }} {{ lang.nativeName }}
        </v-btn>
      </v-btn-toggle>
    </v-card>

    <!-- XP progress for current language -->
    <v-card class="mb-6 pa-4">
      <div class="d-flex justify-space-between align-center mb-2">
        <div class="text-subtitle-2 text-medium-emphasis">{{ currentLangLabel }} LEVEL</div>
        <div class="text-body-2 font-weight-medium" style="color:#a78bfa">{{ xpLabel }}</div>
      </div>
      <v-progress-linear :model-value="xpProgress" color="secondary" rounded height="8" bg-color="surface-variant" />
      <div class="text-caption text-medium-emphasis mt-1">{{ xpDisplay }} XP · Level {{ xpLevel }}</div>
    </v-card>

    <!-- Mode cards -->
    <div class="text-subtitle-2 text-medium-emphasis mb-3">START PRACTICING</div>
    <v-row dense class="mb-6">
      <v-col cols="12" sm="6">
        <v-card class="mode-card pa-5 cursor-pointer" @click="router.push('/drill')">
          <v-icon size="36" color="primary" class="mb-3">mdi-repeat</v-icon>
          <div class="text-h6 font-weight-bold mb-1">Sentence Drills</div>
          <div class="text-body-2 text-medium-emphasis">Repeat targeted sentences. Compare your intonation with the native speaker.</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card class="mode-card pa-5 cursor-pointer" @click="router.push('/conversation')">
          <v-icon size="36" color="secondary" class="mb-3">mdi-forum</v-icon>
          <div class="text-h6 font-weight-bold mb-1">Free Conversation</div>
          <div class="text-body-2 text-medium-emphasis">Have a natural conversation with the AI. Speak and listen in real-time.</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent sessions -->
    <div v-if="recentSessions.length > 0">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-subtitle-2 text-medium-emphasis">RECENT SESSIONS</div>
        <v-btn variant="text" size="small" @click="router.push('/history')">View all</v-btn>
      </div>
      <v-list lines="two" class="rounded-lg" bg-color="surface">
        <v-list-item
          v-for="s in recentSessions"
          :key="s.id"
          :title="sessionTitle(s)"
          :subtitle="sessionSubtitle(s)"
        >
          <template #prepend>
            <v-icon :color="s.mode === 'drill' ? 'primary' : 'secondary'">
              {{ s.mode === 'drill' ? 'mdi-repeat' : 'mdi-forum' }}
            </v-icon>
          </template>
          <template #append>
            <v-chip v-if="s.avg_score" :color="scoreColor(s.avg_score)" variant="tonal" size="x-small">
              {{ Math.round(s.avg_score) }}%
            </v-chip>
          </template>
        </v-list-item>
      </v-list>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useSettingsStore } from '@/stores/settings.js'
import { api } from '@/services/api.js'
import { formatDistanceToNow } from 'date-fns'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()

const recentSessions = ref([])

const LANGS = [
  { code: 'de', nativeName: 'Deutsch' }, { code: 'fr', nativeName: 'Français' },
  { code: 'es', nativeName: 'Español' }, { code: 'en', nativeName: 'English' },
]

onMounted(async () => {
  try {
    const sessions = await api.get('/api/history')
    recentSessions.value = sessions.slice(0, 3)
  } catch {}
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning!'
  if (h < 18) return 'Good afternoon!'
  return 'Good evening!'
})

const stats = computed(() => auth.user?.stats || {})
const streak = computed(() => stats.value.streak_days ?? 0)

const xpKey = computed(() => `xp_${settings.language}`)
const xpDisplay = computed(() => stats.value[xpKey.value] ?? 0)
const xpLevel = computed(() => Math.floor(xpDisplay.value / 100) + 1)
const xpProgress = computed(() => (xpDisplay.value % 100))
const xpLabel = computed(() => `Level ${xpLevel.value}`)
const currentLangLabel = computed(() => LANGS.find(l => l.code === settings.language)?.nativeName.toUpperCase() || '')

function scoreColor(s) {
  if (s >= 80) return 'success'
  if (s >= 55) return 'warning'
  return 'error'
}

function sessionTitle(s) {
  const l = LANGS.find(x => x.code === s.language)?.nativeName || s.language
  return `${l} · ${s.mode === 'drill' ? s.topic || 'Drill' : 'Conversation'}`
}

function sessionSubtitle(s) {
  const ago = formatDistanceToNow(new Date(s.completed_at * 1000), { addSuffix: true })
  return `${s.sentence_count} ${s.mode === 'drill' ? 'sentences' : 'turns'} · ${ago}`
}
</script>

<style scoped>
.mode-card {
  cursor: pointer;
  transition: all 0.15s ease;
  background: rgba(255,255,255,0.04) !important;
  border: 1px solid rgba(255,255,255,0.06);
}
.mode-card:hover { filter: brightness(1.15); transform: translateY(-2px) }
.pb-24 { padding-bottom: 96px }
</style>
