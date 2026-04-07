import { useState } from 'react'
import { useWatchlist } from '../hooks/useWatchlist'
import { normalizeTicker } from '../utils/tickerSymbols'

const TICKER_RE = /^[A-Z]{1,5}$/

export function WatchlistPage() {
  const { symbols, loading, error, addSymbol, removeSymbol, moveSymbol } =
    useWatchlist()
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState('')

  async function handleAdd(event) {
    event.preventDefault()
    const raw = input.trim().toUpperCase()

    if (!TICKER_RE.test(raw)) {
      setValidationError(
        'Enter a 1–5 letter ticker symbol (e.g. AAPL, LMT, SPY). Full company names are not supported.',
      )
      return
    }

    const ticker = normalizeTicker(raw)

    if (symbols.includes(ticker)) {
      setValidationError(`${ticker} is already in your watchlist.`)
      return
    }

    setValidationError('')
    await addSymbol(ticker)
    setInput('')
  }

  if (loading) {
    return <p className="centered-text">Loading watchlist...</p>
  }

  return (
    <section className="watchlist-page">
      <div className="watchlist-header">
        <h2>Watchlist</h2>
        <p className="muted-label">
          Build the set of symbols that power your dashboard, ticker tape, and time-lapse snapshots.
        </p>
      </div>

      <div className="watchlist-shell">
        <form className="watchlist-add-card" onSubmit={handleAdd}>
          <div className="watchlist-add-copy">
            <span className="watchlist-kicker">Add a symbol</span>
            <h3>Track another stock</h3>
            <p className="muted-label">
              Enter a valid US ticker symbol like AAPL, NVDA, LMT, or SPY.
            </p>
          </div>

          <div className="watchlist-add-form">
            <input
              type="text"
              placeholder="Ticker symbol (e.g. AAPL)"
              value={input}
              onChange={(e) => {
                setInput(e.target.value.toUpperCase())
                if (validationError) setValidationError('')
              }}
              maxLength={5}
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button type="submit" disabled={!input.trim()}>
              Add symbol
            </button>
          </div>
        </form>

        {validationError && <p className="error-text">{validationError}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="watchlist-summary-bar">
          <span className="watchlist-count">
            {symbols.length} symbol{symbols.length !== 1 ? 's' : ''} in your watchlist
          </span>
          <span className="watchlist-summary-note">
            Use the arrows to set the order shown on your dashboard.
          </span>
        </div>

        {symbols.length === 0 ? (
          <div className="watchlist-empty-state">
            <h3>Your watchlist is empty</h3>
            <p className="muted-label">
              Add your first ticker above to start filling the dashboard and save snapshots into Time-Lapse later.
            </p>
          </div>
        ) : (
          <ul className="watchlist-items">
            {symbols.map((symbol, index) => (
              <li key={symbol} className="watchlist-row">
                <div className="watchlist-row-main">
                  <span className="watchlist-rank">#{index + 1}</span>
                  <div className="watchlist-symbol-block">
                    <span className="watchlist-symbol">{symbol}</span>
                    <span className="watchlist-row-note">
                      Appears in this order on your dashboard ticker panels.
                    </span>
                  </div>
                </div>

                <div className="watchlist-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={index === 0}
                    onClick={() => moveSymbol(index, -1)}
                    aria-label={`Move ${symbol} up`}
                    title="Move up"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={index === symbols.length - 1}
                    onClick={() => moveSymbol(index, 1)}
                    aria-label={`Move ${symbol} down`}
                    title="Move down"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => removeSymbol(symbol)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
