<template>
  <div>
    <div class="text-center mb-6">
      <div class="text-h5 font-weight-bold mb-1" style="color: #22d3ee">Session Complete!</div>
      <div class="text-body-2 text-medium-emphasis">
        {{ langLabel }} · {{ topicLabel }}
      </div>
    </div>

    <!-- Stats row -->
    <v-row dense class="mb-6">
      <v-col cols="4">
        <v-card class="stat-card pa-3 text-center">
          <div class="text-h5 font-weight-bold" :style="{ color: avgColor }">{{ avgDisplay }}</div>
          <div class="text-caption text-medium-emphasis">Avg Score</div>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card class="stat-card pa-3 text-center">
          <div class="text-h5 font-weight-bold" style="color: #22d3ee">{{ sentences.length }}</div>
          <div class="text-caption text-medium-emphasis">Sentences</div>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card class="stat-card pa-3 text-center">
          <div class="text-h5 font-weight-bold" style="color: #a78bfa">{{ stats?.stats?.streak_days ?? '—' }}</div>
          <div class="text-caption text-medium-emphasis">Day Streak</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Per-sentence results -->
    <div class="text-subtitle-2 text-medium-emphasis mb-3">RESULTS</div>
    <v-list lines="one" class="mb-6 rounded-lg" bg-color="surface">
      <v-list-item v-for="(s, i) in sentences" :key="i" :subtitle="s.text">
        <template #prepend>
          <span class="text-body-2 text-medium-emphasis mr-3">{{ i + 1 }}</span>
        </template>
        <template #append>
          <v-chip
            v-if="s.score !== null"
            :color="scoreColor(s.score)"
            variant="tonal"
            size="small"
          >{{ s.score }}%</v-chip>
          <v-chip v-else color="grey" variant="tonal" size="small">skipped</v-chip>
        </template>
      </v-list-item>
    </v-list>

    <!-- Best / Worst -->
    <template v-if="best || worst">
      <v-row dense class="mb-6">
        <v-col v-if="best" cols="6">
          <v-card class="pa-3" color="success" variant="tonal">
            <div class="text-caption font-weight-bold mb-1">BEST</div>
            <div class="text-body-2">{{ best.text }}</div>
            <div class="text-caption">{{ best.score }}%</div>
          </v-card>
        </v-col>
        <v-col v-if="worst" cols="6">
          <v-card class="pa-3" color="error" variant="tonal">
            <div class="text-caption font-weight-bold mb-1">NEEDS WORK</div>
            <div class="text-body-2">{{ worst.text }}</div>
            <div class="text-caption">{{ worst.score }}%</div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <div class="d-flex gap-3">
      <v-btn variant="tonal" flex="1" class="flex-1" @click="$emit('go-home')">Home</v-btn>
      <v-btn color="primary" flex="1" class="flex-1" @click="$emit('new-session')">New Drill</v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sentences: { type: Array, default: () => [] },
  language:  { type: String, default: '' },
  topic:     { type: String, default: '' },
  topics:    { type: Array, default: () => [] },
  stats:     { type: Object, default: null },
})
defineEmits(['new-session', 'go-home'])

const LANGS = [
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'es', nativeName: 'Español' },
  { code: 'en', nativeName: 'English' },
]
const langLabel = computed(() => LANGS.find(l => l.code === props.language)?.nativeName || props.language)
const topicLabel = computed(() => props.topics.find(t => t.id === props.topic)?.label || props.topic)

const scored = computed(() => props.sentences.filter(s => s.score !== null))
const avg = computed(() => {
  if (!scored.value.length) return null
  return Math.round(scored.value.reduce((a, b) => a + b.score, 0) / scored.value.length)
})
const avgDisplay = computed(() => avg.value !== null ? `${avg.value}%` : '—')
const avgColor = computed(() => {
  if (avg.value === null) return 'grey'
  if (avg.value >= 80) return '#34d399'
  if (avg.value >= 55) return '#fbbf24'
  return '#f87171'
})

const best = computed(() => {
  const s = scored.value
  if (!s.length) return null
  return s.reduce((a, b) => (b.score > a.score ? b : a))
})
const worst = computed(() => {
  const s = scored.value
  if (!s.length) return null
  return s.reduce((a, b) => (b.score < a.score ? b : a))
})

function scoreColor(s) {
  if (s === null) return 'grey'
  if (s >= 80) return 'success'
  if (s >= 55) return 'warning'
  return 'error'
}
</script>

<style scoped>
.stat-card { background: rgba(255,255,255,0.04) !important }
.flex-1 { flex: 1 }
.gap-3 { gap: 12px }
</style>
