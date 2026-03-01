import { useState } from 'react'
import { useWatchlist } from '../hooks/useWatchlist'

export function WatchlistPage() {
  const { symbols, loading, error, addSymbol, removeSymbol, moveSymbol } =
    useWatchlist()
  const [input, setInput] = useState('')

  async function handleAdd(event) {
    event.preventDefault()
    await addSymbol(input)
    setInput('')
  }

  if (loading) {
    return <p className="centered-text">Loading watchlist...</p>
  }

  return (
    <section>
      <h2>Watchlist</h2>

      <form className="watchlist-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Ticker symbol (e.g. AAPL)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!input.trim()}>
          Add
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {symbols.length === 0 ? (
        <p className="muted-label" style={{ marginTop: '1rem' }}>
          No symbols yet. Add a ticker above to get started.
        </p>
      ) : (
        <ul className="watchlist-items">
          {symbols.map((symbol, index) => (
            <li key={symbol} className="watchlist-row">
              <span className="watchlist-symbol">{symbol}</span>

              <div className="watchlist-actions">
                <button
                  type="button"
                  className="btn-icon"
                  disabled={index === 0}
                  onClick={() => moveSymbol(index, -1)}
                  aria-label="Move up"
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  disabled={index === symbols.length - 1}
                  onClick={() => moveSymbol(index, 1)}
                  aria-label="Move down"
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
    </section>
  )
}
