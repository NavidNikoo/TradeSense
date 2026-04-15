import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAuth } from '../contexts/AuthContext'
import { TickerPanel } from '../components/TickerPanel'
import { DashboardTickerStrip } from '../components/DashboardTickerStrip'
import { saveSnapshot } from '../services/timeLapseService'

const STAGGER_MS = 80
const HINT_KEY = 'tradesense_first_run_dismissed'

export function DashboardPage() {
  const { user } = useAuth()
  const { symbols, loading } = useWatchlist()
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(HINT_KEY) === '1',
  )

  function dismissHint() {
    setHintDismissed(true)
    localStorage.setItem(HINT_KEY, '1')
  }

  const [sortBy, setSortBy] = useState('default')
  const [quoteMap, setQuoteMap] = useState({})
  const [visibleCount, setVisibleCount] = useState(0)
  const [expandedSymbol, setExpandedSymbol] = useState(null)

  const displaySymbols = useMemo(() => {
    const list = symbols.slice(0, 10)
    if (sortBy === 'alpha') return [...list].sort()
    if (sortBy === 'change') {
      return [...list].sort((a, b) => {
        const ca = quoteMap[a]?.changePercent ?? 0
        const cb = quoteMap[b]?.changePercent ?? 0
        return cb - ca
      })
    }
    return list
  }, [symbols, sortBy, quoteMap])

  useEffect(() => {
    if (loading || symbols.length === 0) return
    setVisibleCount(0)
    const total = Math.min(symbols.length, 10)
    const timers = []
    for (let i = 0; i < total; i++) {
      timers.push(setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * STAGGER_MS))
    }
    return () => timers.forEach(clearTimeout)
  }, [symbols, loading])

  const handleToggleExpand = useCallback((sym) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym))
  }, [])

  function handleQuoteLoaded(sym, data) {
    setQuoteMap((prev) => {
      if (prev[sym]?.changePercent === data?.changePercent) return prev
      return { ...prev, [sym]: data }
    })
  }

  async function handleSnapshot(data) {
    if (!user) throw new Error('Not signed in')
    await saveSnapshot(user.uid, data.symbol, {
      sentimentSummary: data.sentimentSummary,
      priceSnapshot: data.priceSnapshot,
    })
  }

  if (loading) {
    return (
      <section className="dashboard-wrapper">
        <h2>Dashboard</h2>
        <div className="dashboard-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="ticker-panel ticker-skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-chart" />
              <div className="skeleton-line skeleton-text" />
              <div className="skeleton-line skeleton-text short" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (symbols.length === 0) {
    return (
      <section className="dashboard-wrapper empty-dashboard">
        <h2>Dashboard</h2>
        <p className="muted-label">
          Your watchlist is empty. Add symbols to see sentiment and price data
          here.
        </p>
        <Link to="/watchlist">
          <button type="button">Go to Watchlist</button>
        </Link>
      </section>
    )
  }

  const upCount = Object.values(quoteMap).filter((q) => q?.changePercent > 0).length
  const downCount = Object.values(quoteMap).filter((q) => q?.changePercent < 0).length
  const flatCount = Object.keys(quoteMap).length - upCount - downCount

  return (
    <section className="dashboard-wrapper">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="dashboard-controls">
          {Object.keys(quoteMap).length > 0 && (
            <span className="dashboard-summary">
              {symbols.length} symbol{symbols.length !== 1 ? 's' : ''}
              {upCount > 0 && <span className="change-positive"> · {upCount} up</span>}
              {downCount > 0 && <span className="change-negative"> · {downCount} down</span>}
              {flatCount > 0 && <span className="change-neutral"> · {flatCount} flat</span>}
            </span>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="dashboard-sort-select"
            aria-label="Sort symbols"
          >
            <option value="default">Watchlist order</option>
            <option value="alpha">A → Z</option>
            <option value="change">% Change ↓</option>
          </select>
        </div>
      </div>

      {!hintDismissed && symbols.length > 0 && symbols.length <= 3 && (
        <div className="dashboard-hint">
          <p>
            <strong>Tip:</strong> Add more symbols on the{' '}
            <Link to="/watchlist">Watchlist</Link> page, then expand any card
            to see full charts, news, and sentiment.
          </p>
          <button
            className="dashboard-hint-close"
            type="button"
            onClick={dismissHint}
            aria-label="Dismiss tip"
          >
            &times;
          </button>
        </div>
      )}

      <DashboardTickerStrip symbols={symbols} />

      <div className="dashboard-grid">
        {displaySymbols.map((sym, i) => (
          i < visibleCount ? (
            <TickerPanel
              key={sym}
              symbol={sym}
              expanded={expandedSymbol === sym}
              onToggleExpand={handleToggleExpand}
              onSnapshot={handleSnapshot}
              onQuoteLoaded={(data) => handleQuoteLoaded(sym, data)}
            />
          ) : (
            <div key={sym} className="ticker-panel ticker-skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-chart" />
              <div className="skeleton-line skeleton-text" />
              <div className="skeleton-line skeleton-text short" />
            </div>
          )
        ))}
      </div>
    </section>
  )
}
