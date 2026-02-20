import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'
import { generateDrillSentences, textToSpeech, transcribeAudio, DRILL_TOPICS, SUPPORTED_LANGUAGES, AVAILABLE_MODELS } from '../services/openai.js'
import { db } from '../db.js'

const router = Router()
router.use(requireAuth)

router.get('/topics', (req, res) => {
  res.json(DRILL_TOPICS)
})

router.get('/languages', (req, res) => {
  res.json(SUPPORTED_LANGUAGES)
})

router.get('/models', (req, res) => {
  res.json(AVAILABLE_MODELS)
})

const generateSchema = z.object({
  language: z.enum(['en', 'de', 'fr', 'es']),
  topic: z.string().min(1),
  model: z.string().optional(),
  count: z.number().int().min(3).max(15).optional(),
})

router.post('/generate', async (req, res) => {
  const result = generateSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { language, topic, model, count } = result.data
  const sentences = await generateDrillSentences({ language, topic, model, count })

  // Create a session record
  const sessionId = uuidv4()
  db.prepare(`
    INSERT INTO practice_sessions (id, user_id, language, mode, topic)
    VALUES (?, ?, ?, 'drill', ?)
  `).run(sessionId, req.user.id, language, topic)

  res.json({ sessionId, sentences })
})

const ttsSchema = z.object({
  text: z.string().min(1).max(500),
  voice: z.string().optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
})

router.post('/tts', async (req, res) => {
  const result = ttsSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const audioBuffer = await textToSpeech(result.data)
  res.set('Content-Type', 'audio/mpeg')
  res.send(audioBuffer)
})

const completeSchema = z.object({
  sessionId: z.string().uuid(),
  sentences: z.array(z.object({
    text: z.string(),
    score: z.number().min(0).max(100).nullable(),
  })),
})

router.post('/complete', (req, res) => {
  const result = completeSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { sessionId, sentences } = result.data

  const session = db.prepare('SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const scores = sentences.filter((s) => s.score !== null).map((s) => s.score)
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null

  db.prepare(`
    UPDATE practice_sessions
    SET avg_score = ?, sentence_count = ?, completed_at = unixepoch()
    WHERE id = ?
  `).run(avgScore, sentences.length, sessionId)

  // Persist messages
  const insertMsg = db.prepare('INSERT INTO messages (id, session_id, role, text, score) VALUES (?, ?, ?, ?, ?)')
  for (const s of sentences) {
    insertMsg.run(uuidv4(), sessionId, 'assistant', s.text, s.score)
  }

  // Update streaks + XP
  updateStreakAndXp(req.user.id, session.language, scores)

  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(req.user.id)
  res.json({ avgScore, stats })
})

function updateStreakAndXp(userId, language, scores) {
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let newStreak = stats.streak_days
  if (stats.last_practice_date === today) {
    // Already practiced today, no streak change
  } else if (stats.last_practice_date === yesterday) {
    newStreak += 1
  } else {
    newStreak = 1
  }

  const xpGained = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length / 10) * scores.length
    : 0

  const xpCol = `xp_${language}`
  db.prepare(`
    UPDATE user_stats
    SET streak_days = ?, last_practice_date = ?, ${xpCol} = ${xpCol} + ?
    WHERE user_id = ?
  `).run(newStreak, today, xpGained, userId)
}

const transcribeSchema = z.object({
  language: z.enum(['en', 'de', 'fr', 'es']),
})

router.post('/transcribe', async (req, res) => {
  if (!req.headers['content-type']?.includes('audio')) {
    return res.status(400).json({ error: 'Expected audio body' })
  }
  const langResult = transcribeSchema.safeParse({ language: req.query.language })
  if (!langResult.success) return res.status(400).json({ error: 'Invalid language' })

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const audioBuffer = Buffer.concat(chunks)

  const text = await transcribeAudio(audioBuffer, langResult.data.language)
  res.json({ text })
})

export default router