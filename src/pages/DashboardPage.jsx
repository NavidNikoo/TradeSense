import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAuth } from '../contexts/AuthContext'
import { TickerPanel } from '../components/TickerPanel'
import { saveSnapshot } from '../services/timeLapseService'

export function DashboardPage() {
  const { user } = useAuth()
  const { symbols, loading } = useWatchlist()

  async function handleSnapshot(data) {
    if (!user) return

    try {
      await saveSnapshot(user.uid, data.symbol, {
        sentimentSummary: data.sentimentSummary,
        priceSnapshot: data.priceSnapshot,
      })
    } catch {
      // Snapshot save failed silently for now
    }
  }

  if (loading) {
    return <p className="centered-text">Loading dashboard...</p>
  }

  if (symbols.length === 0) {
    return (
      <section className="empty-dashboard">
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

  return (
    <section>
      <h2>Dashboard</h2>
      <div className="dashboard-grid">
        {symbols.slice(0, 10).map((sym) => (
          <TickerPanel key={sym} symbol={sym} onSnapshot={handleSnapshot} />
        ))}
      </div>
    </section>
  )
}
