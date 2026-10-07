export function GET() {
  return Response.json(
    { currencySymbol: process.env.CURRENCY_SYMBOL || '$' },
    {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
