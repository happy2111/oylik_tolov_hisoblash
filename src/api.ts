import type { InstallmentSettings } from './types'

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const payload = (await res.json()) as T | ApiEnvelope<T>

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as ApiEnvelope<T>).message)
        : `Request failed (${res.status})`
    throw new Error(message)
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T
  }

  return payload as T
}

export async function fetchConfig(): Promise<{ currencySymbol: string }> {
  try {
    return await getJson<{ currencySymbol: string }>('/api/config')
  } catch {
    return { currencySymbol: '$' }
  }
}

export async function fetchInstallmentSettings(): Promise<InstallmentSettings> {
  return getJson<InstallmentSettings>('/api/installment-settings')
}
