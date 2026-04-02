import { normalizeTicker } from '../utils/tickerSymbols'

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY
const FINNHUB_BASE = 'https://finnhub.io/api/v1'

// --- In-memory cache (5 min TTL) ---

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map()

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

/**
 * Daily chart history. Finnhub /stock/candle returns 403 on free tier
 * ("You don't have this resource"), so we use Yahoo Finance chart API.
 * In dev, Vite proxies /api/yahoo → query1.finance.yahoo.com to avoid CORS issues.
 */
async function fetchYahooHistory(upper, range = '1m') {
  const rangeParam = range === '3m' ? '3mo' : '1mo'
  const base = import.meta.env.DEV
    ? '/api/yahoo'
    : 'https://query1.finance.yahoo.com'
  const url = `${base}/v8/finance/chart/${encodeURIComponent(upper)}?interval=1d&range=${rangeParam}&includePrePost=false`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `Chart data unavailable (${res.status}). Try again later, or check the ticker symbol.`,
    )
  }

  const json = await res.json()
  const result = json.chart?.result?.[0]
  if (!result) {
    const err = json.chart?.error?.description
    throw new Error(err || `No chart data for "${upper}".`)
  }

  const timestamps = result.timestamp || []
  const quote = result.indicators?.quote?.[0]
  const closes = quote?.close || []
  const history = []

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close == null || Number.isNaN(close)) continue
    history.push({
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      close,
    })
  }

  if (history.length === 0) {
    throw new Error(`No chart data for "${upper}".`)
  }

  return { symbol: upper, history }
}

// --- Public API ---

export async function getQuote(symbol) {
  const upper = normalizeTicker(symbol)

  if (!FINNHUB_KEY) {
    throw new Error(
      'No market-data API key. Add VITE_FINNHUB_API_KEY to your .env file — see README for signup instructions.',
    )
  }

  const cacheKey = `quote:${upper}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(upper)}&token=${FINNHUB_KEY}`
  const res = await fetch(url)

  if (res.status === 429) {
    throw new Error('Finnhub rate limit reached. Wait a moment and reload.')
  }
  if (!res.ok) {
    throw new Error(`Finnhub request failed (${res.status}).`)
  }

  const json = await res.json()

  if (!json || json.c === undefined || json.c === 0) {
    throw new Error(
      `No quote data for "${upper}". Make sure this is a valid US stock ticker (e.g. AAPL, LMT, SPY).`,
    )
  }

  const result = {
    symbol: upper,
    price: json.c,
    changePercent: json.dp != null ? +json.dp.toFixed(2) : 0,
    /** Prior regular-session close (Finnhub `pc`) — used for chart fallback when daily history API fails */
    previousClose: json.pc != null && json.pc > 0 ? json.pc : undefined,
    updatedAt: json.t
      ? new Date(json.t * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  }

  setCache(cacheKey, result)
  return result
}

export async function getHistory(symbol, range = '1m') {
  const upper = normalizeTicker(symbol)

  const days = range === '3m' ? 90 : 30
  const cacheKey = `history:${upper}:${days}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const result = await fetchYahooHistory(upper, range)
  setCache(cacheKey, result)
  return result
}
