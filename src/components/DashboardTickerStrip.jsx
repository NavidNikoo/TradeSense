import { useEffect, useState, useCallback } from 'react'
import { getQuote } from '../services/marketDataService'
import { normalizeTicker } from '../utils/tickerSymbols'

const STALE_MS = 2 * 60 * 1000

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function DashboardTickerStrip({ symbols }) {
  const [rows, setRows] = useState([])
  const [loadedAt, setLoadedAt] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    const list = symbols.slice(0, 20).map((s) => normalizeTicker(s))

    async function load() {
      const results = await Promise.allSettled(list.map((sym) => getQuote(sym)))
      if (cancelled) return
      const now = Date.now()
      setLoadedAt(now)
      setRows(
        list.map((sym, i) => {
          const r = results[i]
          if (r.status === 'fulfilled') {
            const q = r.value
            return {
              symbol: q.symbol,
              price: q.price,
              changePercent: q.changePercent,
              ok: true,
            }
          }
          return { symbol: sym, ok: false }
        }),
      )
    }

    load()
    return () => { cancelled = true }
  }, [symbols])

  const scrollToPanel = useCallback((sym) => {
    const id = `ticker-panel-${sym.replace(/[^a-z0-9]/gi, '-')}`
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'instant' : 'smooth',
      block: 'start',
    })
  }, [])

  if (symbols.length === 0) return null

  const isLive = loadedAt && now - loadedAt < STALE_MS
  const displayRows = rows.length === 0
    ? symbols.slice(0, 20).map((sym) => ({ symbol: normalizeTicker(sym), ok: false, loading: true }))
    : rows

  function renderTickerItems(list, keySuffix, interactive = true) {
    return list.map((row) => {
      const content = row.ok ? (
        <>
          <strong className="dashboard-ticker-symbol">{row.symbol}</strong>
          <span className="dashboard-ticker-price">
            ${row.price?.toFixed(2)}
          </span>
          <span
            className={
              row.changePercent > 0
                ? 'change-positive'
                : row.changePercent < 0
                  ? 'change-negative'
                  : 'change-neutral'
            }
          >
            {row.changePercent > 0 ? '+' : ''}
            {row.changePercent?.toFixed(2)}%
          </span>
        </>
      ) : (
        <>
          <strong className="dashboard-ticker-symbol">{row.symbol}</strong>
          <span className="change-neutral">{row.loading ? '…' : '—'}</span>
        </>
      )

      if (!interactive) {
        return (
          <span
            key={`${row.symbol}-${keySuffix}`}
            className="dashboard-ticker-item dashboard-ticker-item--ghost"
            aria-hidden="true"
          >
            {content}
          </span>
        )
      }

      return (
        <button
          type="button"
          key={`${row.symbol}-${keySuffix}`}
          className={`dashboard-ticker-item dashboard-ticker-btn ${row.loading ? 'dashboard-ticker-item--loading' : ''}`}
          onClick={() => scrollToPanel(row.symbol)}
          aria-label={`Scroll to ${row.symbol} panel`}
        >
          {content}
        </button>
      )
    })
  }

  return (
    <div className="dashboard-ticker-strip" aria-label="Watchlist prices">
      <div className="dashboard-ticker-strip-viewport">
        <div className="dashboard-ticker-strip-track">
          <div className="dashboard-ticker-strip-group">
            {renderTickerItems(displayRows, 'a')}
          </div>
          <div className="dashboard-ticker-strip-group" aria-hidden="true">
            {renderTickerItems(displayRows, 'b', false)}
          </div>
        </div>
      </div>
      {loadedAt && (
        <span className="dashboard-ticker-meta">
          {isLive && <span className="live-dot" aria-hidden="true" />}
          <span className="dashboard-ticker-time">
            {formatTime(loadedAt)}
          </span>
        </span>
      )}
    </div>
  )
}
