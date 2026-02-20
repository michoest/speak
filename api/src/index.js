import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRouter from './routes/auth.js'
import drillsRouter from './routes/drills.js'
import conversationRouter from './routes/conversation.js'
import historyRouter from './routes/history.js'
import realtimeRouter from './routes/realtime.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use('/auth', authRouter)
app.use('/api/drills', drillsRouter)
app.use('/api/conversation', conversationRouter)
app.use('/api/history', historyRouter)
app.use('/api/realtime', realtimeRouter)

app.get('/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Speak API running on http://localhost:${PORT}`)
})