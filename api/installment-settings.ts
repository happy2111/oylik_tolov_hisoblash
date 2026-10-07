import { fetchInstallmentSettings } from './lib/erp'

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
    return Response.json(
      { success: false, message },
      { status: 502 },
    )
  }
}
