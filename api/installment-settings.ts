import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchInstallmentSettings } from '../server/erp'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (_req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Method not allowed' })
    return
  }

  try {
    const data = await fetchInstallmentSettings()
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[api] installment-settings', message)
    res.status(502).json({
      success: false,
      message,
    })
  }
}
