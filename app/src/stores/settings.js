import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const LANGS = [
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
]

const MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
  { id: 'gpt-4.5-preview', label: 'GPT-4.5 (Latest)' },
]

const VOICES = [
  { id: 'nova', label: 'Nova (Female)' },
  { id: 'alloy', label: 'Alloy (Neutral)' },
  { id: 'echo', label: 'Echo (Male)' },
  { id: 'fable', label: 'Fable (British)' },
  { id: 'onyx', label: 'Onyx (Deep)' },
  { id: 'shimmer', label: 'Shimmer (Warm)' },
]

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export const useSettingsStore = defineStore('settings', () => {
  const language = ref(load('speak:language', 'de'))
  const model = ref(load('speak:model', 'gpt-4o'))
  const voice = ref(load('speak:voice', 'nova'))
  const ttsSpeed = ref(load('speak:ttsSpeed', 1.0))
  const drillCount = ref(load('speak:drillCount', 8))

  watch(language, (v) => localStorage.setItem('speak:language', JSON.stringify(v)))
  watch(model, (v) => localStorage.setItem('speak:model', JSON.stringify(v)))
  watch(voice, (v) => localStorage.setItem('speak:voice', JSON.stringify(v)))
  watch(ttsSpeed, (v) => localStorage.setItem('speak:ttsSpeed', JSON.stringify(v)))
  watch(drillCount, (v) => localStorage.setItem('speak:drillCount', JSON.stringify(v)))

  return { language, model, voice, ttsSpeed, drillCount, LANGS, MODELS, VOICES }
})
