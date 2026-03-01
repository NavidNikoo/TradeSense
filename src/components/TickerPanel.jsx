import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { getQuote, getHistory } from '../services/marketDataService'
import { getNews } from '../services/newsService'
import { scoreArticles } from '../services/sentimentService'

export function TickerPanel({ symbol, onSnapshot }) {
  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState([])
  const [articles, setArticles] = useState([])
  const [sentiment, setSentiment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const [quoteData, historyData, newsData] = await Promise.all([
          getQuote(symbol),
          getHistory(symbol, '1m'),
          getNews(symbol),
        ])

        if (cancelled) return

        setQuote(quoteData)
        setHistory(historyData.history)
        setArticles(newsData.articles)

        const sentimentData = await scoreArticles(newsData.articles)
        if (!cancelled) setSentiment(sentimentData)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [symbol])

  if (loading) {
    return (
      <div className="ticker-panel ticker-loading">
        Loading {symbol}...
      </div>
    )
  }

  if (error) {
    return (
      <div className="ticker-panel ticker-error">
        Failed to load {symbol}: {error}
      </div>
    )
  }

  const changeClass = quote?.changePercent > 0
    ? 'change-positive'
    : quote?.changePercent < 0
      ? 'change-negative'
      : 'change-neutral'

  const sentimentClass = sentiment?.aggregate
    ? `sentiment-${sentiment.aggregate.label}`
    : 'sentiment-neutral'

  function handleSnapshot() {
    if (!onSnapshot || !quote || !sentiment) return
    onSnapshot({
      symbol,
      sentimentSummary: sentiment.aggregate,
      priceSnapshot: {
        close: quote.price,
        changePercent: quote.changePercent,
      },
    })
  }

  return (
    <div className="ticker-panel">
      <div className="ticker-header">
        <span className="ticker-symbol">{quote?.symbol || symbol}</span>
        <span className="ticker-price">
          ${quote?.price?.toFixed(2)}{' '}
          <span className={changeClass}>
            ({quote?.changePercent > 0 ? '+' : ''}{quote?.changePercent?.toFixed(2)}%)
          </span>
        </span>
      </div>

      {history.length > 0 && (
        <div className="ticker-chart">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                width={50}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {sentiment?.aggregate && (
        <div style={{ margin: '0.5rem 0' }}>
          <span className="ticker-section-title">Sentiment </span>
          <span className={`sentiment-badge ${sentimentClass}`}>
            {sentiment.aggregate.label} ({sentiment.aggregate.score})
          </span>
        </div>
      )}

      {articles.length > 0 && (
        <>
          <p className="ticker-section-title">Recent News</p>
          <ul className="news-list">
            {articles.slice(0, 5).map((article, i) => (
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
        </>
      )}

      {onSnapshot && (
        <button type="button" className="snapshot-btn" onClick={handleSnapshot}>
          Save to Time-Lapse
        </button>
      )}
    </div>
  )
}
