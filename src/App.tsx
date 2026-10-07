import { useEffect, useMemo, useState } from 'react'
import { fetchConfig, fetchInstallmentSettings } from './api'
import {
  buildSchedule,
  calculateInstallment,
  formatMoney,
  formatSignedMoney,
  toNumber,
} from './calc'
import type { InstallmentPlan, InstallmentSettings } from './types'

type Screen = 'calc' | 'schedule'

function sortPlans(plans: InstallmentPlan[]) {
  return [...plans].sort((a, b) => a.months - b.months)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('calc')
  const [settings, setSettings] = useState<InstallmentSettings | null>(null)
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [priceInput, setPriceInput] = useState('1000')
  const [initialPayment, setInitialPayment] = useState(0)
  const [planIndex, setPlanIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [cfg, data] = await Promise.all([
          fetchConfig(),
          fetchInstallmentSettings(),
        ])
        if (cancelled) return

        setCurrencySymbol(cfg.currencySymbol || '$')
        setSettings(data)

        if (!data.isActive) {
          setError('Rassrochka hozircha o‘chirilgan')
        } else if (!data.plans?.length) {
          setError('Rassrochka jadvallari topilmadi')
        } else {
          const sorted = sortPlans(data.plans)
          const preferred =
            sorted.findIndex((p) => p.months === 6) >= 0
              ? sorted.findIndex((p) => p.months === 6)
              : 0
          setPlanIndex(preferred)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Ma’lumot yuklanmadi',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const plans = useMemo(
    () => sortPlans(settings?.plans ?? []),
    [settings],
  )

  const selectedPlan = plans[planIndex]

  const minInitial = useMemo(() => {
    const limit = settings?.limits?.[0]
    return Math.max(0, toNumber(limit?.minInitialPayment))
  }, [settings])

  const productPrice = Math.max(0, toNumber(priceInput))

  const clampedInitial = Math.min(
    Math.max(initialPayment, Math.min(minInitial, productPrice)),
    productPrice,
  )

  const calc = useMemo(
    () => calculateInstallment(productPrice, clampedInitial, selectedPlan),
    [productPrice, clampedInitial, selectedPlan],
  )

  const initialPercent =
    productPrice > 0 ? Math.round((clampedInitial / productPrice) * 100) : 0

  const schedule = useMemo(
    () => buildSchedule(calc.months, calc.monthly),
    [calc.months, calc.monthly],
  )

  const handleClear = () => {
    setPriceInput('')
    setInitialPayment(0)
  }

  const handlePriceChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, '')
    setPriceInput(cleaned)
    const nextPrice = toNumber(cleaned)
    setInitialPayment((prev) => Math.min(prev, nextPrice))
  }

  const handleInitialChange = (value: number) => {
    const next = Math.min(Math.max(value, 0), productPrice)
    setInitialPayment(next)
  }

  if (loading) {
    return (
      <div className="app shell">
        <div className="state">Yuklanmoqda...</div>
      </div>
    )
  }

  if (error && (!settings || plans.length === 0)) {
    return (
      <div className="app shell">
        <div className="state error">{error}</div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Qayta urinish
        </button>
      </div>
    )
  }

  if (screen === 'schedule') {
    return (
      <div className="app schedule-screen">
        <header className="schedule-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => setScreen('calc')}
          >
            ← Orqaga
          </button>
          <h1>To‘lov grafigi</h1>
        </header>

        <div className="schedule-card">
          <div className="schedule-table-head">
            <span>№</span>
            <span>SANA</span>
            <span className="right">SUMMA ({currencySymbol === '$' ? 'USD' : currencySymbol})</span>
          </div>
          <div className="schedule-rows">
            {schedule.map((row) => (
              <div key={row.index} className="schedule-row">
                <span className="muted">{row.index}</span>
                <span className="date">{row.dateLabel}</span>
                <span className="amount">
                  {formatMoney(row.amount, currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app shell">
      <section className="card">
        <div className="card-top">
          <span className="label">MAHSULOT TANNARXI</span>
          <button type="button" className="link-danger" onClick={handleClear}>
            TOZALASH
          </button>
        </div>
        <div className="price-row">
          <span className="currency">{currencySymbol}</span>
          <input
            className="price-input"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="underline" />
      </section>

      <section className="card">
        <div className="card-top">
          <span className="label">BOSHLANG‘ICH TO‘LOV</span>
          <span className="accent-blue">{initialPercent}%</span>
        </div>
        <div className="big-value green">
          {formatMoney(clampedInitial, currencySymbol).replace(currencySymbol, '')}
        </div>
        <input
          className="range"
          type="range"
          min={0}
          max={productPrice || 0}
          step={productPrice > 1000 ? 10 : 1}
          value={clampedInitial}
          disabled={productPrice <= 0}
          onChange={(e) => handleInitialChange(Number(e.target.value))}
        />
      </section>

      <section className="card">
        <div className="card-top">
          <span className="label">MUDDAT</span>
          <span className="pill">
            {selectedPlan ? `${selectedPlan.months} OY` : '—'}
          </span>
        </div>
        <input
          className="range"
          type="range"
          min={0}
          max={Math.max(plans.length - 1, 0)}
          step={1}
          value={planIndex}
          disabled={plans.length === 0}
          onChange={(e) => setPlanIndex(Number(e.target.value))}
        />
        <div className="markup-row">
          <span>USTAMA ({calc.markupPercent}%)</span>
          <strong>{formatSignedMoney(calc.markup, currencySymbol)}</strong>
        </div>
      </section>

      <section className="result">
        <div>
          <div className="label">OYLIK TO‘LOV</div>
          <div className="monthly">
            {formatMoney(calc.monthly, currencySymbol)}
          </div>
        </div>
        <div className="jami">
          <div className="label">JAMI</div>
          <div className="jami-value">
            {formatMoney(Math.round(calc.jami), currencySymbol)}
          </div>
        </div>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <button
        type="button"
        className="btn-primary"
        disabled={calc.monthly <= 0}
        onClick={() => setScreen('schedule')}
      >
        Grafikni ko‘rish
      </button>
    </div>
  )
}
