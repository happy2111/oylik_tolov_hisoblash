export type InstallmentPlan = {
  id: string
  months: number
  coefficient: string | number
}

export type InstallmentLimit = {
  currencyId: string
  currency?: { symbol?: string }
  minInitialPayment?: string | number | null
  maxAmount?: string | number | null
}

export type InstallmentSettings = {
  isActive: boolean
  plans: InstallmentPlan[]
  limits: InstallmentLimit[]
}

type CacheEntry = {
  expiresAt: number
  data: InstallmentSettings
}

const CACHE_TTL_MS = 60_000
let cache: CacheEntry | null = null

export function getErpConfig() {
  const erpApiUrl = (process.env.ERP_API_URL || 'https://api.erp.applepark.uz').replace(
    /\/$/,
    '',
  )
  const integrationToken = process.env.INTEGRATION_TOKEN || ''
  const currencySymbol = process.env.CURRENCY_SYMBOL || '$'

  return { erpApiUrl, integrationToken, currencySymbol }
}

export async function fetchInstallmentSettings(): Promise<InstallmentSettings> {
  const { erpApiUrl, integrationToken } = getErpConfig()

  if (!integrationToken) {
    throw new Error('INTEGRATION_TOKEN is not configured')
  }

  if (cache && cache.expiresAt > Date.now()) {
    return cache.data
  }

  const response = await fetch(`${erpApiUrl}/integration/v1/installment-settings`, {
    headers: {
      Authorization: `Bearer ${integrationToken}`,
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
