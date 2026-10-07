type InstallmentSettings = {
  isActive: boolean
  plans: Array<{
    id: string
    months: number
    coefficient: string | number
  }>
  limits: Array<{
    currencyId: string
    currency?: { symbol?: string }
    minInitialPayment?: string | number | null
    maxAmount?: string | number | null
  }>
}

let cache:
  | {
      expiresAt: number
      data: InstallmentSettings
    }
  | null = null

const CACHE_TTL_MS = 60_000

async function fetchInstallmentSettings(): Promise<InstallmentSettings> {
  const erpApiUrl = (
    process.env.ERP_API_URL || 'https://api.erp.applepark.uz'
  ).replace(/\/$/, '')
  const integrationToken = process.env.INTEGRATION_TOKEN || ''

  if (!integrationToken) {
    throw new Error('INTEGRATION_TOKEN is not configured')
  }

  if (cache && cache.expiresAt > Date.now()) {
    return cache.data
  }

  const response = await fetch(
    `${erpApiUrl}/integration/v1/installment-settings`,
    {
      headers: {
        Authorization: `Bearer ${integrationToken}`,
        Accept: 'application/json',
      },
    },
  )

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

export async function GET() {
  try {
    const data = await fetchInstallmentSettings()
    return Response.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api] installment-settings', message)
    return Response.json({ success: false, message }, { status: 502 })
  }
}
