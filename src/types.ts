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

export type ScheduleRow = {
  index: number
  dateLabel: string
  amount: number
}

export type CalcResult = {
  financed: number
  markup: number
  markupPercent: number
  monthly: number
  jami: number
  coefficient: number
  months: number
}
