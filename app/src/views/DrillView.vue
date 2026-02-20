<template>
  <v-container class="pa-4 pb-24" style="max-width: 640px">

    <!-- Setup phase -->
    <template v-if="phase === 'setup'">
      <div class="text-h6 font-weight-bold mb-1" style="color: #22d3ee">Sentence Drills</div>
      <div class="text-body-2 text-medium-emphasis mb-6">
        {{ langLabel }} · {{ settings.drillCount }} sentences
      </div>

      <div class="text-subtitle-2 text-medium-emphasis mb-3">CHOOSE A TOPIC</div>
      <v-row dense>
        <v-col v-for="t in topics" :key="t.id" cols="6">
          <v-card
            :variant="selectedTopic === t.id ? 'elevated' : 'tonal'"
            :color="selectedTopic === t.id ? 'primary' : undefined"
            class="topic-card pa-3 cursor-pointer"
            @click="selectedTopic = t.id"
          >
            <div class="text-body-2 font-weight-medium">{{ t.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-btn
        color="primary"
        size="large"
        block
        class="mt-6"
        :loading="generating"
        :disabled="!selectedTopic"
        @click="startDrill"
      >
        Generate Sentences
      </v-btn>

      <v-alert v-if="error" type="error" variant="tonal" class="mt-4" density="compact">{{ error }}</v-alert>
    </template>

    <!-- Drill phase -->
    <template v-else-if="phase === 'drill'">
      <!-- Progress -->
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="text-body-2 text-medium-emphasis">{{ currentIndex + 1 }} / {{ sentences.length }}</div>
        <v-btn icon size="small" variant="text" @click="endEarly">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <v-progress-linear :model-value="progress" color="primary" rounded height="4" class="mb-6" />

      <!-- Current sentence card -->
      <v-card class="pa-5 mb-4 sentence-card">
        <div class="text-h6 text-center mb-3" style="line-height: 1.6">
          {{ currentSentence.text }}
        </div>

        <!-- Score if already recorded -->
        <div v-if="currentSentence.score !== null" class="text-center mb-3">
          <v-chip :color="scoreColor(currentSentence.score)" variant="tonal" size="small">
            {{ currentSentence.score }}%
          </v-chip>
        </div>

        <div class="d-flex gap-3 justify-center">
          <!-- Play TTS -->
          <v-btn
            icon
            variant="tonal"
            :color="playing === currentIndex ? 'primary' : undefined"
            :loading="loadingTts === currentIndex"
            @click="playTts(currentIndex)"
          >
            <v-icon>mdi-volume-high</v-icon>
            <v-tooltip activator="parent">Listen</v-tooltip>
          </v-btn>

          <!-- Repeat -->
          <v-btn
            icon
            color="secondary"
            variant="tonal"
            :disabled="!sentences[currentIndex].audio"
            @click="openRepeat"
          >
            <v-icon>mdi-microphone</v-icon>
            <v-tooltip activator="parent">Repeat & compare</v-tooltip>
          </v-btn>
        </div>
      </v-card>

      <!-- Navigation -->
      <div class="d-flex gap-3 mt-2">
        <v-btn variant="tonal" :disabled="currentIndex === 0" @click="currentIndex--">
          <v-icon start>mdi-chevron-left</v-icon> Back
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="currentIndex < sentences.length - 1"
          color="primary"
          variant="tonal"
          @click="currentIndex++"
        >
          Next <v-icon end>mdi-chevron-right</v-icon>
        </v-btn>
        <v-btn v-else color="primary" @click="completeDrill">
          Finish <v-icon end>mdi-check</v-icon>
        </v-btn>
      </div>
    </template>

    <!-- Summary phase -->
    <template v-else-if="phase === 'summary'">
      <SessionSummary
        :sentences="sentences"
        :language="settings.language"
        :topic="selectedTopic"
        :topics="topics"
        :stats="summaryStats"
        @new-session="resetDrill"
        @go-home="router.push('/')"
      />
    </template>

    <!-- Recorder bottom sheet -->
    <RecorderPanel
      v-model="recorderOpen"
      :sentence="currentSentence?.text"
      :native-audio-b64="currentSentence?.audio"
      @accept="onScoreAccepted"
      @close="recorderOpen = false"
    />
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api.js'
import { useSettingsStore } from '@/stores/settings.js'
import RecorderPanel from '@/components/RecorderPanel.vue'
import SessionSummary from '@/components/SessionSummary.vue'

const router = useRouter()
const settings = useSettingsStore()

const topics = ref([])
const selectedTopic = ref(null)
const sentences = ref([])
const sessionId = ref(null)
const currentIndex = ref(0)
const phase = ref('setup')       // 'setup' | 'drill' | 'summary'
const generating = ref(false)
const error = ref('')
const recorderOpen = ref(false)
const playing = ref(null)
const loadingTts = ref(null)
const summaryStats = ref(null)

const langLabel = computed(() => {
  return settings.LANGS.find(l => l.code === settings.language)?.nativeName || settings.language
})

const currentSentence = computed(() => sentences.value[currentIndex.value] ?? null)
const progress = computed(() => ((currentIndex.value + 1) / sentences.value.length) * 100)

// Load topics
api.get('/api/drills/topics').then(data => { topics.value = data }).catch(() => {})

async function startDrill() {
  generating.value = true
  error.value = ''
  try {
    const { sessionId: sid, sentences: texts } = await api.post('/api/drills/generate', {
      language: settings.language,
      topic: selectedTopic.value,
      model: settings.model,
      count: settings.drillCount,
    })
    sessionId.value = sid
    sentences.value = texts.map(text => ({ text, audio: null, score: null }))
    currentIndex.value = 0
    phase.value = 'drill'

    // Pre-load TTS for first sentence
    loadTts(0)
  } catch (e) {
    error.value = e.message
  } finally {
    generating.value = false
  }
}

async function loadTts(idx) {
  if (sentences.value[idx].audio) return
  loadingTts.value = idx
  try {
    const ab = await api.post('/api/drills/tts', {
      text: sentences.value[idx].text,
      voice: settings.voice,
      speed: settings.ttsSpeed,
    })
    const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)))
    sentences.value[idx] = { ...sentences.value[idx], audio: b64 }

    // Pre-load next
    if (idx + 1 < sentences.value.length) loadTts(idx + 1)
  } catch (e) {
    console.error('TTS error', e)
  } finally {
    if (loadingTts.value === idx) loadingTts.value = null
  }
}

async function playTts(idx) {
  await loadTts(idx)
  if (!sentences.value[idx].audio) return
  playing.value = idx
  const bytes = Uint8Array.from(atob(sentences.value[idx].audio), c => c.charCodeAt(0))
  const ctx = new AudioContext()
  const buf = await ctx.decodeAudioData(bytes.buffer)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start()
  src.onended = () => { if (playing.value === idx) playing.value = null }
}

function openRepeat() {
  if (!currentSentence.value?.audio) return
  recorderOpen.value = true
}

function onScoreAccepted(s) {
  sentences.value[currentIndex.value] = { ...sentences.value[currentIndex.value], score: s }
  recorderOpen.value = false
}

function scoreColor(s) {
  if (s === null) return 'grey'
  if (s >= 80) return 'success'
  if (s >= 55) return 'warning'
  return 'error'
}

async function completeDrill() {
  try {
    const result = await api.post('/api/drills/complete', {
      sessionId: sessionId.value,
      sentences: sentences.value.map(s => ({ text: s.text, score: s.score })),
    })
    summaryStats.value = result
    phase.value = 'summary'
  } catch (e) {
    console.error('Complete error', e)
    phase.value = 'summary'
  }
}

function endEarly() {
  completeDrill()
}

function resetDrill() {
  phase.value = 'setup'
  sentences.value = []
  sessionId.value = null
  selectedTopic.value = null
  currentIndex.value = 0
}
</script>

<style scoped>
.topic-card { cursor: pointer; transition: all 0.15s ease }
.topic-card:hover { filter: brightness(1.1) }
.sentence-card {
  background: linear-gradient(135deg, rgba(34,211,238,0.08), rgba(167,139,250,0.08)) !important;
  border: 1px solid rgba(34,211,238,0.15);
}
.gap-3 { gap: 12px }
.pb-24 { padding-bottom: 96px }
</style>
