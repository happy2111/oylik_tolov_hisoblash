import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Bot, InlineKeyboard } from 'grammy'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const PORT = Number(process.env.PORT || 3080)
const ERP_API_URL = (process.env.ERP_API_URL || 'https://api.erp.applepark.uz').replace(
  /\/$/,
  '',
)
const INTEGRATION_TOKEN = process.env.INTEGRATION_TOKEN || ''
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const WEBAPP_URL = process.env.WEBAPP_URL || ''
const CURRENCY_SYMBOL = process.env.CURRENCY_SYMBOL || '$'
const CACHE_TTL_MS = 60_000

type InstallmentPlan = {
  id: string
  months: number
  coefficient: string | number
}

type InstallmentLimit = {
  currencyId: string
  currency?: { symbol?: string }
  minInitialPayment?: string | number | null
  maxAmount?: string | number | null
}

type InstallmentSettings = {
  isActive: boolean
  plans: InstallmentPlan[]
  limits: InstallmentLimit[]
}

type CacheEntry = {
  expiresAt: number
  data: InstallmentSettings
}

let cache: CacheEntry | null = null

async function fetchInstallmentSettings(): Promise<InstallmentSettings> {
  if (!INTEGRATION_TOKEN) {
    throw new Error('INTEGRATION_TOKEN is not configured')
  }

  if (cache && cache.expiresAt > Date.now()) {
    return cache.data
  }

  const response = await fetch(`${ERP_API_URL}/integration/v1/installment-settings`, {
    headers: {
      Authorization: `Bearer ${INTEGRATION_TOKEN}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ERP API ${response.status}: ${body.slice(0, 200)}`)
  }

  const payload = (await response.json()) as
    | InstallmentSettings
    | { success?: boolean; data?: InstallmentSettings }

  const data =
    payload && typeof payload === 'object' && 'data' in payload && payload.data
      ? payload.data
      : (payload as InstallmentSettings)

  const normalized: InstallmentSettings = {
    isActive: Boolean(data.isActive),
    plans: Array.isArray(data.plans) ? data.plans : [],
    limits: Array.isArray(data.limits) ? data.limits : [],
  }

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: normalized,
  }

  return normalized
}

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
  res.json({
    currencySymbol: CURRENCY_SYMBOL,
  })
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
