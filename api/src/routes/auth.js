import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { db } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { email, password } = result.data
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const password_hash = await bcrypt.hash(password, 12)
  const userId = uuidv4()

  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(userId, email, password_hash)
  db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(userId)

  const sessionId = uuidv4()
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  db.prepare('INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt)

  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: SESSION_TTL_SECONDS * 1000,
  })
  res.json({ id: userId, email })
})

router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.issues[0].message })

  const { email, password } = result.data
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

  const sessionId = uuidv4()
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  db.prepare('INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt)

  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: SESSION_TTL_SECONDS * 1000,
  })
  res.json({ id: user.id, email: user.email })
})

router.post('/logout', requireAuth, (req, res) => {
  const sessionId = req.cookies?.session_id
  db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId)
  res.clearCookie('session_id')
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(req.user.id)
  res.json({ ...req.user, stats })
})

export default router