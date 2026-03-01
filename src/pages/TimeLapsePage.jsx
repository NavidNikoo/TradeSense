import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { getSnapshots } from '../services/timeLapseService'

function defaultDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
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

  async function handleLoad(e) {
    e.preventDefault()
    if (!user || !selectedSymbol) return

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

  if (wlLoading) {
    return <p className="centered-text">Loading...</p>
  }

  return (
    <section>
      <h2>Sentiment Time-Lapse</h2>
      <p className="muted-label">
        Review how sentiment and price changed over time for a symbol.
      </p>

      <form className="timelapse-controls" onSubmit={handleLoad}>
        <label>
          Symbol
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
          >
            <option value="">Select...</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <button type="submit" disabled={!selectedSymbol || loading}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {loaded && snapshots.length === 0 && (
        <p className="muted-label">
          No snapshots found for {selectedSymbol} in this range. Capture
          snapshots from the Dashboard using the &quot;Save to Time-Lapse&quot;
          button.
        </p>
      )}

      {snapshots.length > 0 && (
        <div className="timeline">
          {snapshots.map((snap) => {
            const date = new Date(snap.timestamp)
            const sentClass = snap.sentimentSummary?.label
              ? `sentiment-${snap.sentimentSummary.label}`
              : 'sentiment-neutral'

            return (
              <div key={snap.id} className="timeline-point">
                <p className="timeline-date">
                  {date.toLocaleDateString()} {date.toLocaleTimeString()}
                </p>
                <div className="timeline-details">
                  <span className={`sentiment-badge ${sentClass}`}>
                    {snap.sentimentSummary?.label || 'neutral'} (
                    {snap.sentimentSummary?.score ?? '—'})
                  </span>
                  {snap.priceSnapshot && (
                    <span className="ticker-price">
                      ${snap.priceSnapshot.close?.toFixed(2)}
                      {snap.priceSnapshot.changePercent != null && (
                        <span
                          className={
                            snap.priceSnapshot.changePercent >= 0
                              ? 'change-positive'
                              : 'change-negative'
                          }
                        >
                          {' '}
                          ({snap.priceSnapshot.changePercent > 0 ? '+' : ''}
                          {snap.priceSnapshot.changePercent?.toFixed(2)}%)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
