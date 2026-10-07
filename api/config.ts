import { getCurrencySymbol } from './lib/erp'

export function GET() {
  return Response.json(
    { currencySymbol: getCurrencySymbol() },
    {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
