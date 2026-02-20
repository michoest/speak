import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT ps.*, COUNT(m.id) as message_count
    FROM practice_sessions ps
    LEFT JOIN messages m ON m.session_id = ps.id
    WHERE ps.user_id = ? AND ps.completed_at IS NOT NULL
    GROUP BY ps.id
    ORDER BY ps.completed_at DESC
    LIMIT 50
  `).all(req.user.id)
  res.json(sessions)
})

router.get('/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM practice_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const messages = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC').all(req.params.id)
  res.json({ ...session, messages })
})

export default router