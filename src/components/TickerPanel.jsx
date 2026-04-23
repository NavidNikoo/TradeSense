import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
  ComposedChart, Line, Legend,
} from 'recharts'
import { getQuote, getHistory, AVAILABLE_RANGES, ChartError } from '../services/marketDataService'
import { getNews } from '../services/newsService'
import { scoreArticles } from '../services/sentimentService'
import { enrichChartData, summarizeIndicators } from '../utils/technicalIndicators'
import { buildSentimentExplanation } from '../utils/sentimentExplanation'

const RANGE_LABELS = {
  '1d': '1D', '5d': '5D', '1m': '1M', '3m': '3M',
  '6m': '6M', '1y': '1Y', 'ytd': 'YTD',
}

const DEBOUNCE_MS = 550

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null
  const row = payload[0].payload
  const { date, close, sma20, sma50, rsi14 } = row
  return (
    <div className="chart-tooltip">
      <strong>{date}</strong>
      {close != null && <div>Price: ${close.toFixed(2)}</div>}
      {sma20 != null && <div>SMA 20: ${sma20.toFixed(2)}</div>}
      {sma50 != null && <div>SMA 50: ${sma50.toFixed(2)}</div>}
      {rsi14 != null && <div>RSI 14: {rsi14.toFixed(1)}</div>}
    </div>
  )
}

function formatRsiLabel(zone) {
  if (zone === 'overbought') return 'Overbought'
  if (zone === 'oversold') return 'Oversold'
  if (zone === 'neutral') return 'Neutral'
  return 'Unavailable'
}

function formatVolTierLabel(tier) {
  if (tier === 'low') return 'Low'
  if (tier === 'medium') return 'Medium'
  if (tier === 'high') return 'High'
  return 'Unavailable'
}

export function TickerPanel({ symbol, onSnapshot, onQuoteLoaded, onDataReady, expanded, onToggleExpand, timeLapseEnabled, onToggleTimeLapse }) {
  const [quote, setQuote] = useState(null)
  const [newsError, setNewsError] = useState(null)
  const [articles, setArticles] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Chart state — only populated when expanded
  const [selectedRange, setSelectedRange] = useState('1m')
  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState(null)
  const [chartErrorKind, setChartErrorKind] = useState(null)

  const [saveStatus, setSaveStatus] = useState(null) // 'saving' | 'saved' | 'error'
  const saveTimerRef = useRef(null)
  const debounceRef = useRef(null)
  const autoRetried = useRef(false)
  const chartLoadSeqRef = useRef(0)

  // Derived values (must live above any early returns to keep hook order stable)
  const enrichedChart = useMemo(() => enrichChartData(chartData), [chartData])
  const indicators = useMemo(() => summarizeIndicators(enrichedChart), [enrichedChart])
  const sentimentExplanation = useMemo(
    () => buildSentimentExplanation({ articles, sentiment, symbol }),
    [articles, sentiment, symbol],
  )

  // Emit a consolidated data snapshot whenever the inputs change so parents
  // can evaluate market alerts. Runs on every meaningful update; the parent
  // is responsible for dedup/cooldown logic.
  useEffect(() => {
    if (!onDataReady || !quote) return
    onDataReady({
      symbol,
      price: quote?.price ?? null,
      changePercent: quote?.changePercent ?? null,
      rsi: indicators?.rsi ?? null,
      sentimentLabel: sentiment?.aggregate?.label ?? null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, quote?.price, quote?.changePercent, indicators?.rsi, sentiment?.aggregate?.label])

  // --- Initial load: quote + news only (no chart for collapsed cards) ---
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNewsError(null)
    setArticles([])
    setSentiment(null)

    async function load() {
      try {
        const quoteData = await getQuote(symbol)
        if (cancelled) return
        setQuote(quoteData)
        onQuoteLoaded?.(quoteData)

        const newsResult = await getNews(symbol).catch((err) => ({ _err: err }))
        if (cancelled) return

        if (newsResult._err) {
          setNewsError(newsResult._err.message || 'News unavailable')
        } else {
          setArticles(newsResult.articles)
          const sentimentData = await scoreArticles(newsResult.articles)
          if (!cancelled) setSentiment(sentimentData)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  // --- Chart loader (called on expand or range change) ---
  const loadChart = useCallback(async (range) => {
    const seq = ++chartLoadSeqRef.current
    setChartLoading(true)
    setChartError(null)
    setChartErrorKind(null)
    try {
      const result = await getHistory(symbol, range)
      if (seq !== chartLoadSeqRef.current) return
      setChartData(result.history)
      autoRetried.current = false
    } catch (err) {
      if (seq !== chartLoadSeqRef.current) return
      const kind = err instanceof ChartError ? err.kind : 'unknown'
      setChartError(err.message)
      setChartErrorKind(kind)
      setChartData([])

      // One automatic retry on first rate_limited error for this expand session
      if (kind === 'rate_limited' && !autoRetried.current) {
        autoRetried.current = true
        setTimeout(() => loadChart(range), 3000)
      }
    } finally {
      if (seq === chartLoadSeqRef.current) setChartLoading(false)
    }
  }, [symbol])

  // --- Load chart when panel expands ---
  useEffect(() => {
    if (expanded && chartData.length === 0 && !chartLoading && !chartError) {
      loadChart('1m')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  function handleRangeClick(range) {
    if (range === selectedRange) return
    setSelectedRange(range)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadChart(range), DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => { clearTimeout(debounceRef.current); clearTimeout(saveTimerRef.current) }
  }, [])

  function handleExpand() {
    if (!expanded) {
      onToggleExpand?.(symbol)
      setSelectedRange('1m')
      autoRetried.current = false
    } else {
      onToggleExpand?.(null)
    }
  }

  if (loading) {
    return (
      <div className="ticker-panel ticker-skeleton" id={`ticker-panel-${symbol.replace(/[^a-z0-9]/gi, '-')}`}>
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-chart" />
        <div className="skeleton-line skeleton-text" />
        <div className="skeleton-line skeleton-text short" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="ticker-panel ticker-error" id={`ticker-panel-${symbol.replace(/[^a-z0-9]/gi, '-')}`}>
        Failed to load {symbol}: {error}
      </div>
    )
  }

  const changeClass = quote?.changePercent > 0
    ? 'change-positive'
    : quote?.changePercent < 0
      ? 'change-negative'
      : 'change-neutral'

  const chartColor = quote?.changePercent >= 0 ? '#16a34a' : '#dc2626'

  const sentimentClass = sentiment?.aggregate
    ? `sentiment-${sentiment.aggregate.label}`
    : 'sentiment-neutral'

  const hasDayRange = quote?.high != null && quote?.low != null

  const dollarChange =
    quote?.previousClose != null && quote?.price != null
      ? quote.price - quote.previousClose
      : null

  const showFallbackChart = Boolean(
    chartError
    && quote?.previousClose != null
    && quote?.price != null
    && (chartErrorKind === 'rate_limited' || chartErrorKind === 'no_data'),
  )

  async function handleSnapshot() {
    if (!onSnapshot || !quote) return
    setSaveStatus('saving')
    clearTimeout(saveTimerRef.current)
    try {
      await onSnapshot({
        symbol,
        sentimentSummary: sentiment?.aggregate ?? { label: 'unknown', score: 0 },
        priceSnapshot: {
          close: quote.price,
          changePercent: quote.changePercent,
        },
      })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
    saveTimerRef.current = setTimeout(() => setSaveStatus(null), 3000)
  }

  const panelId = `ticker-panel-${(quote?.symbol || symbol).replace(/[^a-z0-9]/gi, '-')}`

  return (
    <div className={`ticker-panel ${expanded ? 'ticker-panel--expanded' : ''} ${timeLapseEnabled ? 'ticker-panel--recording' : ''}`} id={panelId}>
      <div className="ticker-panel-top">
        <div className="ticker-hero">
          <p className="ticker-exchange">
            US · {quote?.symbol || symbol}
            {timeLapseEnabled && (
              <span className="timelapse-dot" title="Time-Lapse recording active" aria-label="Recording" />
            )}
          </p>
          <div className="ticker-price-row">
            <span className="ticker-price-main">${quote?.price?.toFixed(2)}</span>
            <span className="ticker-change-pill">
              <span className={changeClass}>
                {dollarChange != null && (
                  <>
                    {dollarChange >= 0 ? '+' : ''}
                    ${Math.abs(dollarChange).toFixed(2)}
                    {' '}
                  </>
                )}
                ({quote?.changePercent > 0 ? '+' : ''}{quote?.changePercent?.toFixed(2)}%)
              </span>
            </span>
          </div>
          {quote?.updatedAt && (
            <p className="ticker-asof">As of {quote.updatedAt}</p>
          )}
        </div>
        <div className="ticker-panel-actions">
          {onToggleTimeLapse && (
            <button
              type="button"
              className={`timelapse-toggle-btn${timeLapseEnabled ? ' timelapse-toggle-btn--active' : ''}`}
              onClick={() => onToggleTimeLapse(symbol)}
              aria-pressed={!!timeLapseEnabled}
              title={timeLapseEnabled ? 'Disable Time-Lapse auto-recording' : 'Enable Time-Lapse auto-recording'}
            >
              {timeLapseEnabled ? 'Time-Lapse On' : 'Time-Lapse Off'}
            </button>
          )}
          <button
            type="button"
            className="expand-btn expand-btn--toolbar"
            onClick={handleExpand}
            aria-expanded={expanded}
            aria-controls={`${panelId}-chart`}
          >
            {expanded ? 'Collapse' : 'Chart'}
          </button>
        </div>
      </div>

      {hasDayRange && !expanded && (
        <div className="ticker-stats-strip">
          <div className="ticker-stat-cell">
            <span className="ticker-stat-label">Day range</span>
            <span className="ticker-stat-value">${quote.low.toFixed(2)} – ${quote.high.toFixed(2)}</span>
          </div>
          {quote.open != null && (
            <div className="ticker-stat-cell">
              <span className="ticker-stat-label">Open</span>
              <span className="ticker-stat-value">${quote.open.toFixed(2)}</span>
            </div>
          )}
          {quote.previousClose != null && (
            <div className="ticker-stat-cell">
              <span className="ticker-stat-label">Prev close</span>
              <span className="ticker-stat-value">${quote.previousClose.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* --- Expanded: full chart with range selector --- */}
      {expanded && (
        <div className="ticker-expanded-section" id={`${panelId}-chart`}>
          <div className="ticker-range-bar" role="tablist" aria-label="Chart range">
            {AVAILABLE_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={selectedRange === r}
                className={`range-btn ${selectedRange === r ? 'range-btn--active' : ''}`}
                onClick={() => handleRangeClick(r)}
                disabled={chartLoading}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          {chartError && !chartLoading && (
            <div className={`ticker-alert ${chartErrorKind === 'rate_limited' ? 'ticker-alert--warn' : 'ticker-alert--info'}`}>
              <strong>
                {chartErrorKind === 'rate_limited' ? 'Rate limited' : 'Chart unavailable'}
              </strong>
              <span className="ticker-alert-row">
                {chartErrorKind === 'rate_limited'
                  ? 'Too many chart requests — wait a moment and retry.'
                  : chartError}
                <button type="button" className="retry-btn" onClick={() => { autoRetried.current = false; loadChart(selectedRange) }}>
                  Retry
                </button>
              </span>
            </div>
          )}

          {indicators && (indicators.rsi != null || indicators.volatility != null) && (
            <div className="ticker-indicators" aria-label="Technical indicators">
              {indicators.rsi != null && (
                <div className={`indicator-chip indicator-chip--rsi rsi-${indicators.rsiZone}`}>
                  <span className="indicator-chip-label">RSI 14</span>
                  <span className="indicator-chip-value">
                    {indicators.rsi.toFixed(1)} · {formatRsiLabel(indicators.rsiZone)}
                  </span>
                </div>
              )}
              {indicators.sma20 != null && (
                <div className="indicator-chip indicator-chip--sma sma-20">
                  <span className="indicator-chip-label">SMA 20</span>
                  <span className="indicator-chip-value">${indicators.sma20.toFixed(2)}</span>
                </div>
              )}
              {indicators.sma50 != null && (
                <div className="indicator-chip indicator-chip--sma sma-50">
                  <span className="indicator-chip-label">SMA 50</span>
                  <span className="indicator-chip-value">${indicators.sma50.toFixed(2)}</span>
                </div>
              )}
              {indicators.volatility != null && (
                <div className={`indicator-chip indicator-chip--vol vol-${indicators.volatilityTier}`}>
                  <span className="indicator-chip-label">Volatility 20d</span>
                  <span className="indicator-chip-value">
                    {indicators.volatility.toFixed(2)}% · {formatVolTierLabel(indicators.volatilityTier)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="ticker-chart ticker-chart--expanded">
            {chartLoading ? (
              <div className="expanded-chart-loading">
                <div className="skeleton-line skeleton-chart-lg" />
              </div>
            ) : enrichedChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={enrichedChart}>
                  <defs>
                    <linearGradient id={`grad-${panelId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    interval="preserveStartEnd"
                    tickLine={false}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={56}
                    tickLine={false}
                    axisLine={false}
                    orientation="right"
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
                  <Area
                    name="Price"
                    type="monotone"
                    dataKey="close"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#grad-${panelId})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    name="SMA 20"
                    type="monotone"
                    dataKey="sma20"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                  <Line
                    name="SMA 50"
                    type="monotone"
                    dataKey="sma50"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : showFallbackChart ? (
              <>
                <p className="ticker-fallback-label">
                  {RANGE_LABELS[selectedRange] || selectedRange} history unavailable
                  {chartErrorKind === 'rate_limited' ? ' (rate limited)' : ''}.
                  Showing session move only: prior close vs current price — not the full range.
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={[
                    { date: 'Prev close', close: quote.previousClose },
                    { date: 'Current', close: quote.price },
                  ]}>
                    <defs>
                      <linearGradient id={`grad-fb-${panelId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      width={56}
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={chartColor}
                      strokeWidth={2}
                      fill={`url(#grad-fb-${panelId})`}
                      dot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            ) : !chartError ? (
              <p className="ticker-inline-error">No chart data available</p>
            ) : (
              <p className="ticker-inline-error">Chart could not be loaded. Try Retry or collapse and expand.</p>
            )}
          </div>

          <div className="ticker-stats-grid ticker-stats-grid--expanded">
            {quote?.open != null && (
              <div className="ticker-stat">
                <span className="ticker-stat-label">Open</span>
                <span className="ticker-stat-value">${quote.open.toFixed(2)}</span>
              </div>
            )}
            {quote?.high != null && (
              <div className="ticker-stat">
                <span className="ticker-stat-label">High</span>
                <span className="ticker-stat-value">${quote.high.toFixed(2)}</span>
              </div>
            )}
            {quote?.low != null && (
              <div className="ticker-stat">
                <span className="ticker-stat-label">Low</span>
                <span className="ticker-stat-value">${quote.low.toFixed(2)}</span>
              </div>
            )}
            {quote?.previousClose != null && (
              <div className="ticker-stat">
                <span className="ticker-stat-label">Prev close</span>
                <span className="ticker-stat-value">${quote.previousClose.toFixed(2)}</span>
              </div>
            )}
            {hasDayRange && (
              <div className="ticker-stat">
                <span className="ticker-stat-label">Day range</span>
                <span className="ticker-stat-value">${quote.low.toFixed(2)} – ${quote.high.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {sentiment?.aggregate && (
        <div className="ticker-sentiment">
          <div className="ticker-block ticker-block--sentiment">
            <span className="ticker-section-title">Sentiment</span>
            <span className={`sentiment-badge ${sentimentClass}`}>
              {sentiment.aggregate.label} ({sentiment.aggregate.score})
            </span>
            {sentimentExplanation?.modeLabel && (
              <span
                className={`sentiment-mode-chip sentiment-mode-chip--${sentimentExplanation.modeTone}`}
                title="Where this score came from"
              >
                {sentimentExplanation.modeLabel}
              </span>
            )}
          </div>

          {sentimentExplanation && sentimentExplanation.lines.length > 0 && (
            <ul className="sentiment-explanation">
              {sentimentExplanation.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              {sentimentExplanation.dominantHeadline && (
                <li className="sentiment-explanation-headline">
                  Most influential headline:{' '}
                  {sentimentExplanation.dominantHeadline.url ? (
                    <a
                      href={sentimentExplanation.dominantHeadline.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {sentimentExplanation.dominantHeadline.title}
                    </a>
                  ) : (
                    <span>{sentimentExplanation.dominantHeadline.title}</span>
                  )}
                  {sentimentExplanation.dominantHeadline.label && (
                    <span
                      className={`sentiment-badge sentiment-badge--inline sentiment-${sentimentExplanation.dominantHeadline.label}`}
                    >
                      {sentimentExplanation.dominantHeadline.label}
                    </span>
                  )}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {newsError && articles.length === 0 && (
        <p className="ticker-inline-error">{newsError}</p>
      )}

      {articles.length > 0 && (
        <div className="ticker-block ticker-block--news">
          <p className="ticker-section-title">Recent news</p>
          <ul className="news-list">
            {articles.slice(0, expanded ? 10 : 5).map((article, i) => (
              <li key={i} className="news-item">
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
                {sentiment?.perArticle?.[i] && (
                  <span
                    className={`sentiment-badge sentiment-${sentiment.perArticle[i].label}`}
                  >
                    {sentiment.perArticle[i].label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onSnapshot && quote && (
        <>
          <button
            type="button"
            className={`snapshot-btn ${saveStatus === 'saved' ? 'snapshot-btn--saved' : ''} ${saveStatus === 'error' ? 'snapshot-btn--error' : ''}`}
            onClick={handleSnapshot}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'saved' ? 'Saved!'
              : saveStatus === 'error' ? 'Save failed — retry?'
              : timeLapseEnabled ? 'Save snapshot now'
              : 'Save to Time-Lapse'}
          </button>

          {saveStatus === 'saved' && (
            <p className="snapshot-hint">
              Snapshot added. <Link to="/time-lapse">View in Time-Lapse</Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
