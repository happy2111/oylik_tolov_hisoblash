import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Bot, InlineKeyboard } from 'grammy'
import { fetchInstallmentSettings, getErpConfig } from './erp.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const PORT = Number(process.env.PORT || 3080)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const WEBAPP_URL = process.env.WEBAPP_URL || ''

function startBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[bot] TELEGRAM_BOT_TOKEN not set — bot disabled')
    return
  }

  if (!WEBAPP_URL) {
    console.warn('[bot] WEBAPP_URL not set — WebApp button disabled')
    return
  }

  const bot = new Bot(TELEGRAM_BOT_TOKEN)

  bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard().webApp(
      'Hisoblagichni ochish',
      WEBAPP_URL,
    )

    await ctx.reply(
      'Assalomu alaykum!\n\nOylik to‘lovni hisoblash uchun tugmani bosing.',
      { reply_markup: keyboard },
    )
  })

  bot.catch((err) => {
    console.error('[bot] error', err.error)
  })

  void bot.start({
    onStart: (info) => {
      console.log(`[bot] @${info.username} started`)
    },
  })
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/config', (_req, res) => {
  const { currencySymbol } = getErpConfig()
  res.json({ currencySymbol })
})

app.get('/api/installment-settings', async (_req, res) => {
  try {
    const data = await fetchInstallmentSettings()
    res.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api] installment-settings', message)
    res.status(502).json({
      success: false,
      message,
    })
  }
})

const distDir = path.join(rootDir, 'dist')
app.use(express.static(distDir))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    return next()
  }
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) {
      res
        .status(404)
        .send('Build not found. Run npm run build (or use npm run dev with Vite).')
    }
  })
})

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
  startBot()
})
