import type { CalcResult, InstallmentPlan, ScheduleRow } from './types'

const UZ_MONTHS = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'Iyn',
  'Iyl',
  'Avg',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
] as const

export function toNumber(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function calculateInstallment(
  productPrice: number,
  initialPayment: number,
  plan: InstallmentPlan | undefined,
): CalcResult {
  const months = plan?.months ?? 0
  const coefficient = plan ? toNumber(plan.coefficient) : 1
  const price = Math.max(0, productPrice)
  const initial = Math.min(Math.max(0, initialPayment), price)
  const financed = Math.max(0, price - initial)
  const totalWithCoeff = financed * coefficient
  const markup = Math.round((totalWithCoeff - financed) * 100) / 100
  const monthly = months > 0 ? Math.round(totalWithCoeff / months) : 0
  const jami = totalWithCoeff + initial
  const markupPercent = Math.round((coefficient - 1) * 100)

  return {
    financed,
    markup,
    markupPercent,
    monthly,
    jami,
    coefficient,
    months,
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  // Handle month overflow (e.g. Jan 31 + 1 month)
  if (result.getDate() < day) {
    result.setDate(0)
  }
  return result
}

export function formatUzDate(date: Date): string {
  const day = date.getDate()
  const month = UZ_MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${day}-${month}, ${year}`
}

/** First payment = next month from today, then +1 month each. */
export function buildSchedule(
  months: number,
  monthly: number,
  from: Date = new Date(),
): ScheduleRow[] {
  if (months <= 0 || monthly <= 0) return []

  return Array.from({ length: months }, (_, i) => {
    const date = addMonths(from, i + 1)
    return {
      index: i + 1,
      dateLabel: formatUzDate(date),
      amount: monthly,
    }
  })
}

export function formatMoney(value: number, symbol = '$'): string {
  const abs = Math.abs(value)
  const formatted = Number.isInteger(abs)
    ? abs.toLocaleString('en-US')
    : abs.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
  const sign = value < 0 ? '-' : ''
  return `${sign}${symbol}${formatted}`
}

export function formatSignedMoney(value: number, symbol = '$'): string {
  const prefix = value >= 0 ? '+' : '-'
  return `${prefix}${formatMoney(Math.abs(value), symbol)}`
}
