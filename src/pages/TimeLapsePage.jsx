import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { getSnapshots, deleteSnapshot } from '../services/timeLapseService'
import { buildTimeLapseInsights } from '../utils/timeLapseInsights'
import { TimeLapseChatPanel } from '../components/TimeLapseChatPanel'

const DATE_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: 365 * 3 },
]

function toDateStr(d) { return d.toISOString().slice(0, 10) }

function defaultDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start: toDateStr(start), end: toDateStr(end) }
}

function formatShortDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatMoney(value) {
  if (value == null) return 'N/A'
  return `$${value.toFixed(2)}`
}

function formatPercent(value) {
  if (value == null) return null
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function sentimentToNum(label) {
  if (label === 'positive') return 1
  if (label === 'negative') return -1
  return 0
}

function SnapshotChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="chart-tooltip">
      <strong>{row.label}</strong>
      {row.price != null && <div>Price: ${row.price.toFixed(2)}</div>}
      {row.sentimentLabel && <div>Sentiment: {row.sentimentLabel}</div>}
    </div>
  )
}

function SnapshotChart({ snapshots }) {
  const data = useMemo(() => snapshots.map((s) => ({
    label: formatShortDate(s.timestamp),
    price: s.priceSnapshot?.close ?? null,
    sentiment: sentimentToNum(s.sentimentSummary?.label),
    sentimentLabel: s.sentimentSummary?.label || 'unknown',
  })), [snapshots])

  if (data.length < 2) return null

  return (
    <div className="tl-chart-wrapper">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={56}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis
            yAxisId="sent"
            orientation="right"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            width={44}
            tickLine={false}
            axisLine={false}
            domain={[-1.5, 1.5]}
            ticks={[-1, 0, 1]}
            tickFormatter={(v) => v === 1 ? '+' : v === -1 ? '−' : '·'}
          />
          <Tooltip content={<SnapshotChartTooltip />} />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: '#2563eb' }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls
          />
          <Line
            yAxisId="sent"
            type="stepAfter"
            dataKey="sentiment"
            stroke="#a855f7"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ r: 3, strokeWidth: 0, fill: '#a855f7' }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="tl-chart-legend">
        <span className="tl-legend-item"><span className="tl-legend-swatch tl-legend--price" /> Price</span>
        <span className="tl-legend-item"><span className="tl-legend-swatch tl-legend--sentiment" /> Sentiment</span>
      </div>
    </div>
  )
}

function TimeLapseHelpContent() {
  return (
    <div className="tl-help-inner">
      <h3 className="tl-help-heading">What Time-Lapse is</h3>
      <p>
        Time-Lapse is a <strong>manual history</strong> of moments you choose. Each time you click
        &quot;Save to Time-Lapse&quot; on a ticker panel on the{' '}
        <Link to="/dashboard">Dashboard</Link>, we store that symbol&apos;s price snapshot and a
        sentiment summary for that moment—nothing is recorded automatically in the background.
      </p>

      <h3 className="tl-help-heading">What you see here</h3>
      <ul className="tl-help-list">
        <li>
          <strong>Symbol &amp; date range</strong> — Loads only snapshots you saved between the
          &quot;From&quot; and &quot;To&quot; dates. This is not a full market chart; missing days
          simply mean you did not save a snapshot then.
        </li>
        <li>
          <strong>Trend chart</strong> — Appears when you have <strong>two or more</strong>{' '}
          snapshots. If every point falls on the <strong>same calendar day</strong>, the line may
          look flat because the chart groups by date—use the exact timestamps on the cards below
          to compare intraday moves.
        </li>
        <li>
          <strong>Insights</strong> — Short, rule-based notes comparing your <strong>first and last</strong>{' '}
          loaded snapshots (price change, sentiment labels, and alignment). They reflect your saved
          data only, not live market analysis.
        </li>
      </ul>

      <h3 className="tl-help-heading">Tips</h3>
      <p className="tl-help-tip">
        Save snapshots on different days or at different times to build a clearer picture of how
        price and sentiment evolved across <em>your</em> checkpoints.
      </p>
    </div>
  )
}

function SingleSnapshotPanel({ symbol }) {
  return (
    <div className="tl-single-panel">
      <div className="tl-single-copy">
        <span className="tl-section-kicker">Trend chart locked</span>
        <h3>Add one more snapshot to reveal the trend</h3>
        <p className="muted-label">
          Time-Lapse compares saved moments over time. Save another {symbol} snapshot
          from the <Link to="/dashboard">Dashboard</Link> and this page will unlock the
          chart view automatically.
        </p>
        <Link to="/dashboard" className="tl-cta-btn">Save another snapshot</Link>
      </div>
      <div className="tl-single-visual" aria-hidden="true">
        <div className="tl-single-axis tl-single-axis--y" />
        <div className="tl-single-axis tl-single-axis--x" />
        <div className="tl-single-dot" />
        <div className="tl-single-caption">1 saved point</div>
      </div>
    </div>
  )
}

function InsightsCard({ insights }) {
  if (!insights) return null
  return (
    <aside className="tl-insights">
      <p className="tl-insights-title">
        <span className="tl-insights-icon" aria-hidden="true">&#x2728;</span>
        Insights
      </p>
      <h3 className="tl-insights-headline">{insights.headline}</h3>
      <ul className="tl-insights-list">
        {insights.bullets.map((b, i) => (
          <li key={i} className={`tl-insights-bullet tl-insights-bullet--${b.tone}`}>
            {b.text}
          </li>
        ))}
      </ul>
      {insights.disclaimer && (
        <>
          <hr className="tl-insights-divider" />
          <p className="tl-insights-disclaimer">{insights.disclaimer}</p>
        </>
      )}
    </aside>
  )
}

export function TimeLapsePage() {
  const { user } = useAuth()
  const { symbols, loading: wlLoading } = useWatchlist()

  const defaults = defaultDates()
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)

  function applyPreset(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(toDateStr(start))
    setEndDate(toDateStr(end))
    setValidationError(null)
  }

  function validate() {
    if (!selectedSymbol) return 'Select a symbol first.'
    if (!startDate || !endDate) return 'Both dates are required.'
    if (startDate > endDate) return '"From" date must be on or before "To" date.'
    return null
  }

  async function handleLoad(e) {
    e.preventDefault()
    const vErr = validate()
    if (vErr) {
      setValidationError(vErr)
      return
    }
    setValidationError(null)
    if (!user) return

    setLoading(true)
    setError(null)
    setLoaded(false)

    try {
      const data = await getSnapshots(user.uid, selectedSymbol, startDate, endDate)
      setSnapshots(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (deletingId) return
    setDeletingId(id)
    try {
      await deleteSnapshot(id)
      setSnapshots((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // deletion failed — leave the item
    } finally {
      setDeletingId(null)
    }
  }

  const insights = useMemo(
    () => snapshots.length > 0 ? buildTimeLapseInsights(snapshots, selectedSymbol) : null,
    [snapshots, selectedSymbol],
  )

  if (wlLoading) {
    return (
      <section className="tl-wrapper">
        <h2>Sentiment Time-Lapse</h2>
        <div className="tl-loading">Loading watchlist…</div>
      </section>
    )
  }

  if (symbols.length === 0) {
    return (
      <section className="tl-wrapper">
        <div className="tl-header">
          <div className="tl-header-top">
            <h2>Sentiment Time-Lapse</h2>
            <button
              type="button"
              id="tl-help-toggle-empty"
              className="tl-help-btn"
              onClick={() => setHelpOpen((o) => !o)}
              aria-expanded={helpOpen}
              aria-controls="tl-help-panel-empty"
            >
              {helpOpen ? 'Hide help' : 'How it works'}
            </button>
          </div>
          {helpOpen && (
            <div
              id="tl-help-panel-empty"
              className="tl-help-panel"
              role="region"
              aria-labelledby="tl-help-toggle-empty"
            >
              <TimeLapseHelpContent />
            </div>
          )}
        </div>
        <div className="tl-empty-state">
          <p>You need a watchlist before you can use Time-Lapse.</p>
          <p className="muted-label">
            Add stock symbols to your <Link to="/watchlist">Watchlist</Link>, then
            save snapshots from the <Link to="/dashboard">Dashboard</Link> to track
            how sentiment and price evolve over time.
          </p>
          <Link to="/watchlist" className="tl-cta-btn">Go to Watchlist</Link>
        </div>
      </section>
    )
  }

  const summaryFirst = snapshots.length > 0 ? formatShortDate(snapshots[0].timestamp) : null
  const summaryLast = snapshots.length > 1 ? formatShortDate(snapshots[snapshots.length - 1].timestamp) : null

  return (
    <section className="tl-wrapper">
      <div className="tl-header">
        <div className="tl-header-top">
          <h2>Sentiment Time-Lapse</h2>
          <button
            type="button"
            id="tl-help-toggle"
            className="tl-help-btn"
            onClick={() => setHelpOpen((o) => !o)}
            aria-expanded={helpOpen}
            aria-controls="tl-help-panel"
          >
            {helpOpen ? 'Hide help' : 'How it works'}
          </button>
        </div>
        <p className="tl-intro">
          Time-Lapse is your manual snapshot history for each symbol.
        </p>
        <p className="muted-label">
          Save moments from the Dashboard, then return here to compare how price and
          sentiment shift across those saved checkpoints.
        </p>
        {helpOpen && (
          <div
            id="tl-help-panel"
            className="tl-help-panel"
            role="region"
            aria-labelledby="tl-help-toggle"
          >
            <TimeLapseHelpContent />
          </div>
        )}
      </div>

      <form className="tl-controls" onSubmit={handleLoad}>
        <div className="tl-controls-row">
          <label className="tl-field">
            <span className="tl-field-label">Symbol</span>
            <select
              value={selectedSymbol}
              onChange={(e) => { setSelectedSymbol(e.target.value); setValidationError(null) }}
            >
              <option value="">Select…</option>
              {symbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="tl-field">
            <span className="tl-field-label">From</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => { setStartDate(e.target.value); setValidationError(null) }}
            />
          </label>

          <label className="tl-field">
            <span className="tl-field-label">To</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => { setEndDate(e.target.value); setValidationError(null) }}
            />
          </label>

          <button type="submit" className="tl-load-btn" disabled={!selectedSymbol || loading}>
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>

        <div className="tl-presets">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="tl-preset-btn"
              onClick={() => applyPreset(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      {validationError && <p className="error-text">{validationError}</p>}
      {error && <p className="error-text">{error}</p>}

      {loaded && snapshots.length === 0 && (
        <div className="tl-no-results">
          <p>No snapshots found for <strong>{selectedSymbol}</strong> between {formatShortDate(startDate)} and {formatShortDate(endDate)}.</p>
          <p className="muted-label">
            Go to the <Link to="/dashboard">Dashboard</Link> and click
            &quot;Save to Time-Lapse&quot; on a ticker panel to create your first snapshot.
          </p>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="tl-results-shell">
          <div className="tl-summary">
            <span>{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</span>
            {summaryFirst && summaryLast && (
              <span className="muted-label"> · {summaryFirst} – {summaryLast}</span>
            )}
            {summaryFirst && !summaryLast && (
              <span className="muted-label"> · {summaryFirst}</span>
            )}
          </div>

          <div className="tl-results-layout">
            <div className="tl-results-main">
              {snapshots.length === 1 ? (
                <SingleSnapshotPanel symbol={selectedSymbol} />
              ) : (
                <SnapshotChart snapshots={snapshots} />
              )}

              <div className="tl-timeline">
                {snapshots.map((snap, index) => {
                  const sentClass = snap.sentimentSummary?.label
                    ? `sentiment-${snap.sentimentSummary.label}`
                    : 'sentiment-neutral'
                  const prevSnap = index > 0 ? snapshots[index - 1] : null
                  const prevClose = prevSnap?.priceSnapshot?.close
                  const currentClose = snap.priceSnapshot?.close
                  const deltaFromPrevious = prevClose != null && currentClose != null
                    ? currentClose - prevClose
                    : null
                  const deltaPercent = prevClose && deltaFromPrevious != null
                    ? (deltaFromPrevious / prevClose) * 100
                    : null
                  const deltaClass = deltaFromPrevious > 0
                    ? 'change-positive'
                    : deltaFromPrevious < 0
                      ? 'change-negative'
                      : 'change-neutral'

                  return (
                    <div key={snap.id} className="tl-card">
                      <div className="tl-card-header">
                        <div className="tl-card-heading">
                          <span className="tl-card-kicker">{selectedSymbol} snapshot</span>
                          <span className="tl-card-date">{formatDateTime(snap.timestamp)}</span>
                        </div>
                        <button
                          type="button"
                          className="tl-delete-btn"
                          disabled={deletingId === snap.id}
                          onClick={() => handleDelete(snap.id)}
                          aria-label="Delete snapshot"
                          title="Delete this snapshot"
                        >
                          {deletingId === snap.id ? '…' : '×'}
                        </button>
                      </div>
                      <div className="tl-card-grid">
                        <div className="tl-metric">
                          <span className="tl-metric-label">Price snapshot</span>
                          <span className="tl-card-price">{formatMoney(snap.priceSnapshot?.close)}</span>
                          {snap.priceSnapshot?.changePercent != null && (
                            <span className={snap.priceSnapshot.changePercent >= 0 ? 'change-positive' : 'change-negative'}>
                              {formatPercent(snap.priceSnapshot.changePercent)}
                            </span>
                          )}
                        </div>

                        <div className="tl-metric">
                          <span className="tl-metric-label">Sentiment</span>
                          <span className={`sentiment-badge ${sentClass}`}>
                            {snap.sentimentSummary?.label || 'neutral'}
                            {snap.sentimentSummary?.score != null && ` (${snap.sentimentSummary.score})`}
                          </span>
                          <span className="tl-metric-note">
                            Saved from the dashboard at that moment.
                          </span>
                        </div>

                        <div className="tl-metric">
                          <span className="tl-metric-label">
                            {prevSnap ? 'Vs previous snapshot' : 'Next step'}
                          </span>
                          {prevSnap && deltaFromPrevious != null ? (
                            <>
                              <span className={deltaClass}>
                                {deltaFromPrevious > 0 ? '+' : ''}{formatMoney(deltaFromPrevious).replace('$', '$')}
                                {deltaPercent != null && ` (${formatPercent(deltaPercent)})`}
                              </span>
                              <span className="tl-metric-note">
                                Since {formatShortDate(prevSnap.timestamp)}
                              </span>
                            </>
                          ) : (
                            <span className="tl-metric-note">
                              Save another snapshot to compare momentum over time.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="tl-results-sidebar">
              <InsightsCard insights={insights} />
              <TimeLapseChatPanel
                symbol={selectedSymbol}
                startDate={startDate}
                endDate={endDate}
                snapshots={snapshots}
                insights={insights}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
