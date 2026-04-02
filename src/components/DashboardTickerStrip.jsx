import { useEffect, useState } from 'react'
import { getQuote } from '../services/marketDataService'
import { normalizeTicker } from '../utils/tickerSymbols'

/**
 * Compact horizontal “ticker tape” for all watchlist symbols (prices from cache when panels load).
 */
export function DashboardTickerStrip({ symbols }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    const list = symbols.slice(0, 20).map((s) => normalizeTicker(s))

    async function load() {
      const results = await Promise.allSettled(list.map((sym) => getQuote(sym)))
      if (cancelled) return
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
    return () => {
      cancelled = true
    }
  }, [symbols])

  if (symbols.length === 0) return null

  return (
    <div className="dashboard-ticker-strip" aria-label="Watchlist prices">
      <div className="dashboard-ticker-strip-inner">
        {rows.length === 0
          ? symbols.slice(0, 20).map((sym) => (
              <span key={sym} className="dashboard-ticker-item dashboard-ticker-item--loading">
                {normalizeTicker(sym)} …
              </span>
            ))
          : rows.map((row) => (
              <span
                key={row.symbol}
                className="dashboard-ticker-item"
              >
                {row.ok ? (
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
                    <span className="change-neutral">—</span>
                  </>
                )}
              </span>
            ))}
      </div>
    </div>
  )
}
