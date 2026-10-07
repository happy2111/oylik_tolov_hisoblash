import { useEffect, useMemo, useRef, useState } from 'react'
import { toBlob, toPng } from 'html-to-image'
import { fetchInstallmentSettings } from './api'
import {
  buildSchedule,
  calculateInstallment,
  currencyLabel,
  formatAmount,
  formatMoney,
  toNumber,
  type CurrencyMode,
} from './calc'
import type { InstallmentPlan, InstallmentSettings } from './types'

type Screen = 'calc' | 'schedule'

function sortPlans(plans: InstallmentPlan[]) {
  return [...plans].sort((a, b) => a.months - b.months)
}

function CurrencySwitch({
  value,
  onChange,
}: {
  value: CurrencyMode
  onChange: (v: CurrencyMode) => void
}) {
  return (
    <div className="currency-switch" role="group" aria-label="Valyuta">
      <button
        type="button"
        className={value === 'usd' ? 'active' : ''}
        onClick={() => onChange('usd')}
      >
        $
      </button>
      <button
        type="button"
        className={value === 'uzs' ? 'active' : ''}
        onClick={() => onChange('uzs')}
      >
        so&apos;m
      </button>
    </div>
  )
}

function IconClear() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12a1 1 0 0 0 1-1V8H5v12a1 1 0 0 0 1 1z"
      />
    </svg>
  )
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.1 3.1 0 0 0 0-1.39l7.02-4.11A2.99 2.99 0 1 0 14 5a3 3 0 0 0 .13.84L7.11 9.95a3 3 0 1 0 0 4.1l7.05 4.13c-.1.27-.16.56-.16.86a3 3 0 1 0 3-3z"
      />
    </svg>
  )
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z"
      />
    </svg>
  )
}

function IconPhoto() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
      />
    </svg>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('calc')
  const [settings, setSettings] = useState<InstallmentSettings | null>(null)
  const [currency, setCurrency] = useState<CurrencyMode>('usd')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'share' | 'copy' | 'export' | null>(
    null,
  )

  const [priceInput, setPriceInput] = useState('1000')
  const [initialPayment, setInitialPayment] = useState(0)
  const [editingInitial, setEditingInitial] = useState(false)
  const [initialInput, setInitialInput] = useState('0')
  const [planIndex, setPlanIndex] = useState(0)

  const initialInputRef = useRef<HTMLInputElement>(null)
  const scheduleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchInstallmentSettings()
        if (cancelled) return

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

  useEffect(() => {
    if (editingInitial) {
      initialInputRef.current?.focus()
      initialInputRef.current?.select()
    }
  }, [editingInitial])

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

  const shareText = useMemo(() => {
    const lines = [
      `Mahsulot: ${formatMoney(productPrice, currency)}`,
      `Boshlang‘ich: ${formatMoney(clampedInitial, currency)} (${initialPercent}%)`,
      `Muddat: ${calc.months} oy`,
      `Oylik: ${formatMoney(calc.monthly, currency)}`,
      `Jami: ${formatMoney(Math.round(calc.jami), currency)}`,
      '',
      'To‘lov grafigi:',
      ...schedule.map(
        (row) =>
          `${row.index}. ${row.dateLabel} — ${formatMoney(row.amount, currency)}`,
      ),
    ]
    return lines.join('\n')
  }, [
    productPrice,
    clampedInitial,
    initialPercent,
    calc.months,
    calc.monthly,
    calc.jami,
    schedule,
    currency,
  ])

  const handleClear = () => {
    setPriceInput('')
    setInitialPayment(0)
    setInitialInput('0')
    setEditingInitial(false)
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
    setInitialInput(String(next))
  }

  const startEditInitial = () => {
    setInitialInput(String(clampedInitial || ''))
    setEditingInitial(true)
  }

  const commitInitialInput = () => {
    handleInitialChange(toNumber(initialInput))
    setEditingInitial(false)
  }

  const captureScheduleImage = async () => {
    if (!scheduleRef.current) {
      throw new Error('Grafik topilmadi')
    }
    return toPng(scheduleRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#000000',
    })
  }

  const handleShare = async () => {
    setBusyAction('share')
    try {
      const tg = window.Telegram?.WebApp as
        | { openTelegramLink?: (url: string) => void }
        | undefined

      if (scheduleRef.current && navigator.canShare) {
        try {
          const blob = await toBlob(scheduleRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: '#000000',
          })
          if (blob) {
            const file = new File([blob], 'tolov-grafigi.png', {
              type: 'image/png',
            })
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'To‘lov grafigi',
                text: shareText,
              })
              return
            }
          }
        } catch {
          // fall through to text share
        }
      }

      if (navigator.share) {
        await navigator.share({
          title: 'To‘lov grafigi',
          text: shareText,
        })
        return
      }

      await navigator.clipboard.writeText(shareText)
      tg?.openTelegramLink?.(
        `https://t.me/share/url?url=${encodeURIComponent('')}&text=${encodeURIComponent(shareText)}`,
      )
      window.alert('Matn nusxalandi')
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        window.alert('Ulashib bo‘lmadi')
      }
    } finally {
      setBusyAction(null)
    }
  }

  const handleExportPhoto = async () => {
    setBusyAction('export')
    try {
      const dataUrl = await captureScheduleImage()
      const link = document.createElement('a')
      link.download = 'tolov-grafigi.png'
      link.href = dataUrl
      link.click()
    } catch {
      window.alert('Rasmni eksport qilib bo‘lmadi')
    } finally {
      setBusyAction(null)
    }
  }

  const handleCopy = async () => {
    setBusyAction('copy')
    try {
      await navigator.clipboard.writeText(shareText)
      window.alert('Nusxalandi')
    } catch {
      window.alert('Nusxa olib bo‘lmadi')
    } finally {
      setBusyAction(null)
    }
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
      <div className="app shell schedule-screen">
        <header className="schedule-header">
          <div className="schedule-top">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setScreen('calc')}
              aria-label="Orqaga"
            >
              ←
            </button>
            <h1>To‘lov grafigi</h1>
            <CurrencySwitch value={currency} onChange={setCurrency} />
          </div>
        </header>

        <div className="card schedule-export" ref={scheduleRef}>
          <div className="schedule-export-title">To‘lov grafigi</div>
          <div className="schedule-meta">
            {calc.months} oy · oylik {formatMoney(calc.monthly, currency)}
          </div>
          <div className="schedule-table-head">
            <span>№</span>
            <span>SANA</span>
            <span className="right">SUMMA ({currencyLabel(currency)})</span>
          </div>
          <div className="schedule-rows">
            {schedule.map((row) => (
              <div key={row.index} className="schedule-row">
                <span className="muted">{row.index}</span>
                <span className="date">{row.dateLabel}</span>
                <span className="amount">
                  {formatMoney(row.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="icon-action-row">
          <button
            type="button"
            className="icon-action"
            disabled={busyAction !== null || schedule.length === 0}
            onClick={() => void handleShare()}
            aria-label="Ulashish"
            title="Ulashish"
          >
            <IconShare />
          </button>
          <button
            type="button"
            className="icon-action"
            disabled={busyAction !== null || schedule.length === 0}
            onClick={() => void handleCopy()}
            aria-label="Nusxa olish"
            title="Nusxa olish"
          >
            <IconCopy />
          </button>
          <button
            type="button"
            className="icon-action"
            disabled={busyAction !== null || schedule.length === 0}
            onClick={() => void handleExportPhoto()}
            aria-label="Foto eksport"
            title="Foto eksport"
          >
            <IconPhoto />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app shell calc-screen">
      <div className="toolbar">
        <button
          type="button"
          className="icon-btn danger"
          onClick={handleClear}
          aria-label="Tozalash"
          title="Tozalash"
        >
          <IconClear />
        </button>
        <CurrencySwitch value={currency} onChange={setCurrency} />
      </div>

      <section className="card">
        <div className="card-top">
          <span className="label">MAHSULOT TANNARXI</span>
        </div>
        <div className="price-row">
          {currency === 'usd' ? <span className="currency">$</span> : null}
          <input
            className="price-input"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0"
          />
          {currency === 'uzs' ? (
            <span className="currency suffix">so&apos;m</span>
          ) : null}
        </div>
        <div className="underline" />
      </section>

      <section className="card">
        <div className="card-top">
          <span className="label">BOSHLANG‘ICH TO‘LOV</span>
          <span className="accent-blue">{initialPercent}%</span>
        </div>
        {editingInitial ? (
          <input
            ref={initialInputRef}
            className="big-value-input green"
            inputMode="decimal"
            value={initialInput}
            onChange={(e) =>
              setInitialInput(e.target.value.replace(/[^\d.]/g, ''))
            }
            onBlur={commitInitialInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitInitialInput()
              }
              if (e.key === 'Escape') {
                setEditingInitial(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="big-value green tap-edit"
            onClick={startEditInitial}
          >
            {formatAmount(clampedInitial)}
          </button>
        )}
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
      </section>

      <section className="result">
        <div>
          <div className="label">OYLIK TO‘LOV</div>
          <div className="monthly">
            {formatMoney(calc.monthly, currency)}
          </div>
        </div>
        <div className="jami">
          <div className="label">JAMI</div>
          <div className="jami-value">
            {formatMoney(Math.round(calc.jami), currency)}
          </div>
        </div>
      </section>

      {error ? <p className="inline-error">{error}</p> : null}

      <button
        type="button"
        className="cta-bar"
        disabled={calc.monthly <= 0}
        onClick={() => setScreen('schedule')}
      >
        Grafikni ko‘rish
      </button>
    </div>
  )
}
