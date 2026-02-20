import { db } from '../db.js'

export function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' })

  const session = db
    .prepare('SELECT * FROM auth_sessions WHERE id = ? AND expires_at > unixepoch()')
    .get(sessionId)

  if (!session) return res.status(401).json({ error: 'Session expired or invalid' })

  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(session.user_id)
  if (!user) return res.status(401).json({ error: 'User not found' })

  req.user = user
  next()
}