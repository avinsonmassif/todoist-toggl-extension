import 'dotenv/config'
import express from 'express'
import type { Request } from 'express'
import { verifyTodoist } from './middleware/verify'
import { startHandler, stopHandler } from './routes/process'
import { settingsHandler } from './routes/settings'

const app = express()

app.use(
  express.json({
    verify(req, _res, buf) {
      ;(req as Request).rawBody = buf.toString('utf8')
    },
  }),
)

app.use(verifyTodoist)

app.post('/process', startHandler)
app.post('/process-stop', stopHandler)
app.post('/settings', settingsHandler)

const PORT = Number(process.env['PORT'] ?? 3000)
app.listen(PORT, () => console.log(`todoist-toggl-extension listening on :${PORT}`))
