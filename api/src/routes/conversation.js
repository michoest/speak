import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'
import { generateConversationReply, textToSpeech, SUPPORTED_LANGUAGES } from '../services/openai.js'
import { db } from '../db.js'

const router = Router()
router.use(requireAuth)

const startSchema = z.object({
  language: z.enum(['en', 'de', 'fr', 'es']),
  model: z.string().optional(),
  topic: z.string().optional(),
  voice: z.string().optional(),
})

router.post('/start', async (req, res) => {
  const result = startSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { language, model, topic, voice } = result.data
  const langName = SUPPORTED_LANGUAGES[language]?.name

  const sessionId = uuidv4()
  db.prepare(`
    INSERT INTO practice_sessions (id, user_id, language, mode, topic)
    VALUES (?, ?, ?, 'conversation', ?)
  `).run(sessionId, req.user.id, language, topic || null)

  const openingPrompt = topic
    ? `Start a friendly conversation about "${topic}" in ${langName}. Begin with one short, natural opening sentence.`
    : `Start a friendly casual conversation in ${langName}. Begin with one short, natural opening sentence.`

  const replyText = await generateConversationReply({
    language,
    model,
    history: [{ role: 'user', content: openingPrompt }],
  })

  const msgId = uuidv4()
  db.prepare('INSERT INTO messages (id, session_id, role, text) VALUES (?, ?, ?, ?)').run(msgId, sessionId, 'assistant', replyText)

  const audio = await textToSpeech({ text: replyText, voice })
  const audioB64 = audio.toString('base64')

  res.json({ sessionId, message: { id: msgId, text: replyText, audio: audioB64 } })
})

const messageSchema = z.object({
  sessionId: z.string().uuid(),
  userText: z.string().min(1).max(1000),
  model: z.string().optional(),
  voice: z.string().optional(),
})

router.post('/message', async (req, res) => {
  const result = messageSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { sessionId, userText, model, voice } = result.data
  const session = db.prepare('SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  // Build history from DB
  const pastMessages = db
    .prepare('SELECT role, text FROM messages WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId)
  const history = pastMessages.map((m) => ({ role: m.role, content: m.text }))

  // Save user message
  const userMsgId = uuidv4()
  db.prepare('INSERT INTO messages (id, session_id, role, text) VALUES (?, ?, ?, ?)').run(userMsgId, sessionId, 'user', userText)
  history.push({ role: 'user', content: userText })

  const replyText = await generateConversationReply({ language: session.language, model, history })

  const assistantMsgId = uuidv4()
  db.prepare('INSERT INTO messages (id, session_id, role, text) VALUES (?, ?, ?, ?)').run(assistantMsgId, sessionId, 'assistant', replyText)

  const audio = await textToSpeech({ text: replyText, voice })
  const audioB64 = audio.toString('base64')

  res.json({ message: { id: assistantMsgId, text: replyText, audio: audioB64 } })
})

router.post('/end', (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  const session = db.prepare('SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?').get(sessionId, req.user.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE session_id = ?').get(sessionId).c
  db.prepare('UPDATE practice_sessions SET completed_at = unixepoch(), sentence_count = ? WHERE id = ?').run(msgCount, sessionId)

  res.json({ ok: true })
})

export default router