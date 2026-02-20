import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { openai, SUPPORTED_LANGUAGES } from '../services/openai.js'
import { z } from 'zod'

const router = Router()
router.use(requireAuth)

const tokenSchema = z.object({
  language: z.enum(['en', 'de', 'fr', 'es']),
  voice: z.string().optional(),
  model: z.string().optional(),
})

// Mint a short-lived ephemeral token for the Realtime API
// Frontend connects directly to OpenAI WebSocket using this token
router.post('/token', async (req, res) => {
  const result = tokenSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { language, voice = 'nova', model = 'gpt-4o-realtime-preview' } = result.data
  const langName = SUPPORTED_LANGUAGES[language]?.name || language

  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      instructions: `You are a friendly native ${langName} speaker having a casual conversation to help the user practice ${langName} intonation and pronunciation. Keep replies concise (1-3 sentences). Use natural spoken language. Stay in ${langName} at all times.`,
      input_audio_transcription: { model: 'whisper-1' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return res.status(502).json({ error: 'Failed to create Realtime session', detail: err })
  }

  const data = await response.json()
  res.json({ client_secret: data.client_secret, expires_at: data.expires_at })
})

export default router