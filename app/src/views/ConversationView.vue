<template>
  <v-container class="pa-0 d-flex flex-column" style="height: 100dvh; max-width: 640px">

    <!-- Header -->
    <div class="d-flex align-center pa-4 gap-3" style="border-bottom: 1px solid rgba(255,255,255,0.06)">
      <v-btn icon size="small" variant="text" @click="end">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="flex-1">
        <div class="text-body-1 font-weight-medium">
          {{ langLabel }} Conversation
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ realtimeActive ? '🔴 Live' : 'Text mode' }}
        </div>
      </div>
      <!-- Toggle realtime -->
      <v-btn
        :color="realtimeActive ? 'error' : 'secondary'"
        variant="tonal"
        size="small"
        @click="toggleRealtime"
        :loading="connectingRealtime"
      >
        <v-icon start>{{ realtimeActive ? 'mdi-phone-hangup' : 'mdi-phone' }}</v-icon>
        {{ realtimeActive ? 'End call' : 'Go live' }}
      </v-btn>
    </div>

    <!-- Messages -->
    <div ref="messageList" class="flex-1 overflow-y-auto pa-4" style="gap: 12px; display: flex; flex-direction: column">
      <div v-if="messages.length === 0 && !loading" class="text-center text-medium-emphasis py-12">
        Starting conversation…
      </div>

      <template v-for="(msg, i) in messages" :key="i">
        <!-- Assistant bubble -->
        <div v-if="msg.role === 'assistant'" class="d-flex align-start gap-2">
          <v-avatar color="primary" variant="tonal" size="32">
            <v-icon size="18">mdi-robot</v-icon>
          </v-avatar>
          <div style="max-width: 80%">
            <v-card class="pa-3 assistant-bubble" variant="flat" style="background: rgba(255,255,255,0.08)">
              <div class="text-body-2" style="line-height: 1.6; color: rgba(255,255,255,0.9)">{{ msg.text }}</div>
            </v-card>
            <div class="d-flex gap-2 mt-1">
              <v-btn
                size="x-small"
                variant="text"
                :color="playing === i ? 'primary' : undefined"
                @click="playMessage(i)"
                :disabled="!msg.audio"
              >
                <v-icon size="16">{{ playing === i ? 'mdi-stop' : 'mdi-volume-high' }}</v-icon>
              </v-btn>
              <v-btn
                v-if="msg.audio"
                size="x-small"
                variant="text"
                color="secondary"
                @click="openRepeat(i)"
              >
                <v-icon size="16">mdi-microphone</v-icon> Repeat
              </v-btn>
            </div>
          </div>
        </div>

        <!-- User bubble -->
        <div v-else class="d-flex justify-end">
          <v-card class="pa-3 user-bubble" color="primary" variant="tonal" style="max-width: 80%">
            <div class="text-body-2" style="line-height: 1.6">{{ msg.text }}</div>
          </v-card>
        </div>
      </template>

      <div v-if="loading" class="d-flex align-center gap-2">
        <v-avatar color="primary" variant="tonal" size="32">
          <v-icon size="18">mdi-robot</v-icon>
        </v-avatar>
        <v-card class="pa-3" variant="tonal" color="surface-variant">
          <v-progress-circular indeterminate size="16" width="2" color="primary" />
        </v-card>
      </div>
    </div>

    <!-- Text input -->
    <div v-if="!realtimeActive" class="pa-4" style="border-top: 1px solid rgba(255,255,255,0.06)">
      <div class="d-flex gap-3 align-end">
        <v-textarea
          v-model="userInput"
          :label="`Reply in ${langLabel}…`"
          rows="1"
          auto-grow
          max-rows="4"
          hide-details
          class="flex-1"
          @keydown.enter.exact.prevent="sendMessage"
          :disabled="loading"
        />
        <v-btn
          icon
          color="primary"
          :loading="loading"
          :disabled="!userInput.trim()"
          @click="sendMessage"
        >
          <v-icon>mdi-send</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Realtime status bar -->
    <div v-else class="pa-4 text-center" style="border-top: 1px solid rgba(255,255,255,0.06)">
      <v-chip color="error" variant="tonal" prepend-icon="mdi-microphone">
        Listening… speak {{ langLabel }}
      </v-chip>
    </div>

    <!-- Repeat panel -->
    <RecorderPanel
      v-model="recorderOpen"
      :sentence="repeatSentence"
      :native-audio-b64="repeatAudio"
      @close="recorderOpen = false"
      @accept="recorderOpen = false"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api.js'
import { useSettingsStore } from '@/stores/settings.js'
import RecorderPanel from '@/components/RecorderPanel.vue'

const router = useRouter()
const settings = useSettingsStore()

const messages = ref([])
const sessionId = ref(null)
const userInput = ref('')
const loading = ref(false)
const messageList = ref(null)
const playing = ref(null)
const recorderOpen = ref(false)
const repeatSentence = ref('')
const repeatAudio = ref('')

// Realtime
const realtimeActive = ref(false)
const connectingRealtime = ref(false)
let pc = null     // RTCPeerConnection
let dc = null     // RTCDataChannel

const LANGS = [
  { code: 'de', nativeName: 'Deutsch' }, { code: 'fr', nativeName: 'Français' },
  { code: 'es', nativeName: 'Español' }, { code: 'en', nativeName: 'English' },
]
const langLabel = computed(() => LANGS.find(l => l.code === settings.language)?.nativeName || '')

onMounted(startSession)
onUnmounted(endRealtime)

async function startSession() {
  loading.value = true
  try {
    const data = await api.post('/api/conversation/start', {
      language: settings.language,
      model: settings.model,
      voice: settings.voice,
    })
    sessionId.value = data.sessionId
    messages.value.push({ role: 'assistant', text: data.message.text, audio: data.message.audio })
    await nextTick()
    scrollBottom()
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || loading.value) return
  userInput.value = ''
  messages.value.push({ role: 'user', text })
  loading.value = true
  scrollBottom()
  try {
    const data = await api.post('/api/conversation/message', {
      sessionId: sessionId.value,
      userText: text,
      model: settings.model,
      voice: settings.voice,
    })
    messages.value.push({ role: 'assistant', text: data.message.text, audio: data.message.audio })
    await nextTick()
    scrollBottom()
  } finally {
    loading.value = false
  }
}

async function playMessage(idx) {
  const msg = messages.value[idx]
  if (!msg.audio || playing.value === idx) return
  playing.value = idx
  const bytes = Uint8Array.from(atob(msg.audio), c => c.charCodeAt(0))
  const ctx = new AudioContext()
  const buf = await ctx.decodeAudioData(bytes.buffer)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start()
  src.onended = () => { if (playing.value === idx) playing.value = null }
}

function openRepeat(idx) {
  const msg = messages.value[idx]
  repeatSentence.value = msg.text
  repeatAudio.value = msg.audio
  recorderOpen.value = true
}

function scrollBottom() {
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

async function end() {
  if (sessionId.value) {
    await api.post('/api/conversation/end', { sessionId: sessionId.value }).catch(() => {})
  }
  endRealtime()
  router.push('/')
}

// ── Realtime API (WebRTC ephemeral token) ──────────────────────────────────

async function toggleRealtime() {
  if (realtimeActive.value) { endRealtime(); return }
  connectingRealtime.value = true
  try {
    const { client_secret } = await api.post('/api/realtime/token', {
      language: settings.language,
      voice: settings.voice,
    })

    pc = new RTCPeerConnection()

    // Play remote audio
    const audioEl = new Audio()
    audioEl.autoplay = true
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0] }

    // Add mic
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    pc.addTrack(stream.getTracks()[0], stream)

    dc = pc.createDataChannel('oai-events')
    dc.onmessage = handleRealtimeEvent

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${client_secret.value}`,
        'Content-Type': 'application/sdp',
      },
    })
    const answer = { type: 'answer', sdp: await sdpResp.text() }
    await pc.setRemoteDescription(answer)

    realtimeActive.value = true
  } catch (e) {
    console.error('Realtime connect error', e)
  } finally {
    connectingRealtime.value = false
  }
}

function handleRealtimeEvent(e) {
  try {
    const ev = JSON.parse(e.data)
    if (ev.type === 'response.output_item.done' && ev.item?.content?.[0]?.transcript) {
      messages.value.push({ role: 'assistant', text: ev.item.content[0].transcript, audio: null })
      nextTick(scrollBottom)
    }
    if (ev.type === 'conversation.item.input_audio_transcription.completed') {
      messages.value.push({ role: 'user', text: ev.transcript, audio: null })
      nextTick(scrollBottom)
    }
  } catch {}
}

function endRealtime() {
  if (pc) { pc.close(); pc = null }
  dc = null
  realtimeActive.value = false
}
</script>

<style scoped>
.assistant-bubble { border-radius: 4px 16px 16px 16px !important }
.user-bubble { border-radius: 16px 4px 16px 16px !important }
.gap-2 { gap: 8px }
.gap-3 { gap: 12px }
.flex-1 { flex: 1 }
</style>
