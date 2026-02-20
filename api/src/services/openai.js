import OpenAI from 'openai'

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English' },
  de: { name: 'German', nativeName: 'Deutsch' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
}

export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
  { id: 'gpt-4.5-preview', label: 'GPT-4.5 (Latest)' },
]

export const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

export const DRILL_TOPICS = [
  { id: 'greetings', label: 'Greetings & Small Talk' },
  { id: 'cafe', label: 'At the Café' },
  { id: 'travel', label: 'Travel & Directions' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'work', label: 'Work & Business' },
  { id: 'family', label: 'Family & Friends' },
  { id: 'weather', label: 'Weather' },
  { id: 'food', label: 'Food & Restaurants' },
]

export async function generateDrillSentences({ language, topic, model = 'gpt-4o', count = 8 }) {
  const langName = SUPPORTED_LANGUAGES[language]?.name || language
  const topicLabel = DRILL_TOPICS.find((t) => t.id === topic)?.label || topic

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a language teacher generating intonation practice sentences. Output ONLY a JSON array of strings. No commentary, no markdown, no explanation.`,
      },
      {
        role: 'user',
        content: `Generate ${count} natural ${langName} sentences for the topic "${topicLabel}".
Rules:
- Mix statement, question, and exclamation intonation patterns for variety
- Use everyday vocabulary, B1-B2 level
- Each sentence 6–15 words
- Return ONLY a JSON array: ["sentence 1", "sentence 2", ...]`,
      },
    ],
    temperature: 0.8,
  })

  const raw = completion.choices[0].message.content.trim()
  return JSON.parse(raw)
}

export async function generateConversationReply({ language, model = 'gpt-4o', history }) {
  const langName = SUPPORTED_LANGUAGES[language]?.name || language

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a friendly native ${langName} speaker having a casual conversation to help the user practice ${langName} intonation and pronunciation.
Keep your replies concise (1-3 sentences). Use natural, spoken language. Stay in ${langName} at all times.`,
      },
      ...history,
    ],
    temperature: 0.9,
  })

  return completion.choices[0].message.content
}

export async function textToSpeech({ text, voice = 'nova', speed = 1.0 }) {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    speed,
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  return buffer
}

export async function transcribeAudio(audioBuffer, language) {
  const { toFile } = await import('openai')
  const file = await toFile(audioBuffer, 'recording.webm', { type: 'audio/webm' })
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language,
  })
  return transcription.text
}