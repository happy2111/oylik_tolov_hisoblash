import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getErpConfig } from '../server/erp'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const { currencySymbol } = getErpConfig()
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  res.status(200).json({ currencySymbol })
}
