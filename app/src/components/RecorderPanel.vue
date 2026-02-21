<template>
  <v-bottom-sheet v-model="open" max-width="600">
    <v-card class="pa-4 pb-6">
      <!-- Sentence -->
      <div class="text-body-1 font-weight-medium text-center mb-4 px-2" style="line-height: 1.5">
        {{ sentence }}
      </div>

      <!-- Pitch curves -->
      <div class="pitch-legend mb-1 d-flex gap-4 justify-center text-caption">
        <span style="color:#22d3ee">— Native</span>
        <span style="color:#a78bfa">— You</span>
      </div>
      <PitchCurveChart :native-curve="nativeCurve" :user-curve="userCurve" :height="100" class="mb-4" />

      <!-- Score badge -->
      <div v-if="score !== null" class="text-center mb-4">
        <v-chip :color="scoreColor" variant="tonal" size="large" class="text-h6 font-weight-bold px-6">
          {{ score }}%
        </v-chip>
        <div class="text-caption text-medium-emphasis mt-1">{{ scoreLabel }}</div>
      </div>

      <!-- Controls -->
      <div class="d-flex align-center justify-center gap-3 mb-4">
        <!-- Play native -->
        <v-btn icon :color="playingNative ? 'primary' : undefined" variant="tonal" @click="playNative">
          <v-icon>{{ playingNative ? 'mdi-stop' : 'mdi-volume-high' }}</v-icon>
          <v-tooltip activator="parent">Play native</v-tooltip>
        </v-btn>

        <!-- Record -->
        <v-btn
          icon
          size="x-large"
          :color="recording ? 'error' : 'primary'"
          :variant="recording ? 'elevated' : 'tonal'"
          @click="toggleRecord"
          :loading="analyzing"
        >
          <v-icon>{{ recording ? 'mdi-stop' : 'mdi-microphone' }}</v-icon>
        </v-btn>

        <!-- Play user -->
        <v-btn icon :color="playingUser ? 'secondary' : undefined" variant="tonal" :disabled="!userBlob" @click="playUser">
          <v-icon>{{ playingUser ? 'mdi-stop' : 'mdi-account-voice' }}</v-icon>
          <v-tooltip activator="parent">Play your recording</v-tooltip>
        </v-btn>
      </div>

      <!-- Action buttons -->
      <div class="d-flex gap-3">
        <v-btn variant="tonal" flex="1" class="flex-1" @click="$emit('close')">
          Close
        </v-btn>
        <v-btn color="primary" flex="1" class="flex-1" :disabled="score === null" @click="$emit('accept', score)">
          Accept
        </v-btn>
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import PitchCurveChart from './PitchCurveChart.vue'
import { extractPitchCurve, decodeAudio, computePitchSimilarity } from '@/composables/usePitch.js'

const props = defineProps({
  modelValue: Boolean,
  sentence:   { type: String, default: '' },
  nativeAudioB64: { type: String, default: '' },  // base64 mp3
})

const emit = defineEmits(['update:modelValue', 'close', 'accept'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const nativeCurve = ref([])
const userCurve   = ref([])
const userBlob    = ref(null)
const score       = ref(null)
const recording   = ref(false)
const analyzing   = ref(false)
const playingNative = ref(false)
const playingUser   = ref(false)

let mediaRecorder = null
let nativeAudioBuffer = null
let userAudioBuffer = null
let audioCtx = null

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    const Ctx = window.AudioContext || window.webkitAudioContext
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// Decode native audio when sheet opens or nativeAudioB64 changes
watch(() => [props.modelValue, props.nativeAudioB64], async ([isOpen]) => {
  if (!isOpen) return
  score.value = null
  userCurve.value = []
  userBlob.value = null
  nativeCurve.value = []

  if (!props.nativeAudioB64) return
  const bytes = Uint8Array.from(atob(props.nativeAudioB64), c => c.charCodeAt(0))
  nativeAudioBuffer = await decodeAudio(bytes.buffer)
  nativeCurve.value = extractPitchCurve(nativeAudioBuffer)
})

async function playNative() {
  if (!nativeAudioBuffer) return
  if (playingNative.value) return
  playingNative.value = true
  const ctx = getAudioContext()
  const src = ctx.createBufferSource()
  src.buffer = nativeAudioBuffer
  src.connect(ctx.destination)
  src.start()
  src.onended = () => { playingNative.value = false }
}

async function playUser() {
  if (!userBlob.value || playingUser.value) return
  playingUser.value = true
  const ctx = getAudioContext()
  const ab = await userBlob.value.arrayBuffer()
  const buf = await ctx.decodeAudioData(ab)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start()
  src.onended = () => { playingUser.value = false }
}

async function toggleRecord() {
  if (recording.value) {
    mediaRecorder?.stop()
    return
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = ['audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? ''
  const chunks = []
  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop())
    recording.value = false
    analyzing.value = true

    userBlob.value = new Blob(chunks, { type: mimeType || 'audio/mp4' })
    userAudioBuffer = await decodeAudio(await userBlob.value.arrayBuffer())
    userCurve.value = extractPitchCurve(userAudioBuffer)

    if (nativeCurve.value.length > 0) {
      score.value = computePitchSimilarity(nativeCurve.value, userCurve.value)
    }
    analyzing.value = false
  }

  mediaRecorder.start()
  recording.value = true
}

const scoreColor = computed(() => {
  if (score.value === null) return 'grey'
  if (score.value >= 80) return 'success'
  if (score.value >= 55) return 'warning'
  return 'error'
})

const scoreLabel = computed(() => {
  if (score.value === null) return ''
  if (score.value >= 80) return 'Excellent intonation!'
  if (score.value >= 55) return 'Good — keep practicing'
  return 'Keep trying — record again'
})
</script>

<style scoped>
.flex-1 { flex: 1 }
.gap-3 { gap: 12px }
.gap-4 { gap: 16px }
</style>
