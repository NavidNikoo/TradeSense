import { useState, useEffect, useRef, useCallback } from 'react'
import { useWatchlist } from '../hooks/useWatchlist'
import { normalizeTicker } from '../utils/tickerSymbols'
import { searchSymbols } from '../services/marketDataService'

const TICKER_RE = /^[A-Z]{1,5}$/
const SEARCH_DEBOUNCE_MS = 350
const MAX_QUERY_LEN = 48

function truncate(str, n) {
  if (!str || str.length <= n) return str
  return `${str.slice(0, n - 1)}…`
}

function SymbolPrefixBold({ symbol, query }) {
  const qu = query.trim().toUpperCase()
  const su = symbol.toUpperCase()
  let i = 0
  while (i < qu.length && i < su.length && qu[i] === su[i]) i += 1
  return (
    <span className="watchlist-suggestion-symbol">
      <strong>{su.slice(0, i)}</strong>
      {su.slice(i)}
    </span>
  )
}

export function WatchlistPage() {
  const { symbols, loading, error, addSymbol, removeSymbol, moveSymbol } =
    useWatchlist()
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const listboxId = 'watchlist-symbol-suggestions'
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const q = input.trim()
    if (q.length < 1) {
      setSuggestions([])
      setSearchLoading(false)
      setHighlightIndex(-1)
      return
    }

    setSearchLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const results = await searchSymbols(q)
        if (cancelled) return
        setSuggestions(results)
        setHighlightIndex(results.length > 0 ? 0 : -1)
      } catch {
        if (!cancelled) {
          setSuggestions([])
          setHighlightIndex(-1)
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(t)
      setSearchLoading(false)
    }
  }, [input])

  const showDropdown =
    input.trim().length > 0 && (searchLoading || suggestions.length > 0)

  const selectSuggestion = useCallback((symbol) => {
    setInput(symbol)
    setSuggestions([])
    setHighlightIndex(-1)
    setValidationError('')
    inputRef.current?.focus()
  }, [])

  async function handleAdd(event) {
    event.preventDefault()
    const raw = input.trim().toUpperCase()

    if (!TICKER_RE.test(raw)) {
      setValidationError(
        'Enter a 1–5 letter ticker symbol (e.g. AAPL, LMT, SPY). Pick a suggestion or type the symbol.',
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
    setSuggestions([])
  }

  function handleInputKeyDown(e) {
    if (!showDropdown) return

    if (e.key === 'Escape') {
      setSuggestions([])
      setHighlightIndex(-1)
      e.preventDefault()
      return
    }

    if (suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) =>
        i < suggestions.length - 1 ? i + 1 : 0,
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) =>
        i > 0 ? i - 1 : suggestions.length - 1,
      )
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[highlightIndex].symbol)
    }
  }

  if (loading) {
    return (
      <section className="watchlist-page">
        <div className="watchlist-header">
          <h2>Watchlist</h2>
        </div>
        <div className="watchlist-shell">
          {[1, 2, 3].map((n) => (
            <div key={n} className="watchlist-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1 }}>
                <div className="skeleton-line" style={{ width: '2rem', height: '2rem', borderRadius: '999px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line" style={{ width: '60px', height: '0.9rem', marginBottom: '0.35rem' }} />
                  <div className="skeleton-line" style={{ width: '180px', height: '0.7rem' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
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
              Type a company name or ticker — suggestions appear as you type (including index ETFs: try &ldquo;S&amp;P 500&rdquo; or SPY). Pick one or enter a valid 1–5 letter symbol.
            </p>
          </div>

          <div className="watchlist-add-form">
            <div className="watchlist-autocomplete" ref={wrapRef}>
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls={showDropdown ? listboxId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={
                  showDropdown && highlightIndex >= 0
                    ? `${listboxId}-opt-${highlightIndex}`
                    : undefined
                }
                placeholder="Search company or ticker (e.g. Apple, AAPL)"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.toUpperCase())
                  if (validationError) setValidationError('')
                }}
                onKeyDown={handleInputKeyDown}
                maxLength={MAX_QUERY_LEN}
                autoCapitalize="characters"
                spellCheck={false}
                autoComplete="off"
              />
              {showDropdown && (
                <ul
                  id={listboxId}
                  className="watchlist-suggestions"
                  role="listbox"
                >
                  {searchLoading && suggestions.length === 0 && (
                    <li className="watchlist-suggestion watchlist-suggestion--meta">
                      Searching…
                    </li>
                  )}
                  {!searchLoading &&
                    suggestions.length === 0 &&
                    input.trim().length > 0 && (
                    <li className="watchlist-suggestion watchlist-suggestion--meta">
                      No matching tickers. Try another name or a 1–5 letter symbol.
                    </li>
                  )}
                  {suggestions.map((row, idx) => (
                    <li key={row.symbol} role="presentation">
                      <button
                        type="button"
                        id={`${listboxId}-opt-${idx}`}
                        role="option"
                        aria-selected={highlightIndex === idx}
                        className={
                          highlightIndex === idx
                            ? 'watchlist-suggestion is-active'
                            : 'watchlist-suggestion'
                        }
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => selectSuggestion(row.symbol)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                      >
                        <SymbolPrefixBold symbol={row.symbol} query={input} />
                        <span className="watchlist-suggestion-desc">
                          {truncate(row.description, 52)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
