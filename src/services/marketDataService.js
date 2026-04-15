import { normalizeTicker } from '../utils/tickerSymbols'

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY
const FINNHUB_BASE = 'https://finnhub.io/api/v1'

// --- In-memory cache (quotes 5 min; chart history 10 min — fewer repeat Yahoo calls) ---

const CACHE_TTL_MS = 5 * 60 * 1000
const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map()

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  const ttl = key.startsWith('history:') ? HISTORY_CACHE_TTL_MS : CACHE_TTL_MS
  if (Date.now() - entry.ts > ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

// --- sessionStorage cache for chart history (survives soft refreshes) ---

const SESSION_TTL_MS = 30 * 60 * 1000

function getSessionCached(key) {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.ts > SESSION_TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setSessionCache(key, data) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // quota exceeded — non-fatal
  }
}

// --- Typed chart error for predictable UI behavior ---

export class ChartError extends Error {
  constructor(message, kind = 'unknown') {
    super(message)
    this.name = 'ChartError'
    this.kind = kind
  }
}

// --- Retry helper (longer backoff on 429/503) ---

async function fetchWithRetry(url, { retries = 3, delayMs = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url)
    if (res.status === 429 || res.status === 503) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * 2 ** attempt))
        continue
      }
    }
    return res
  }
  throw new ChartError('Network error after retries', 'network')
}

// --- In-flight deduplication for chart fetches ---

const inflightMap = new Map()

// --- Global queue: one chart network call at a time + small gap (reduces Yahoo 429s in dev) ---

let chartQueueTail = Promise.resolve()
const CHART_QUEUE_GAP_MS = 150

function enqueueChartNetwork(fn) {
  const run = chartQueueTail.then(async () => {
    await new Promise((r) => setTimeout(r, CHART_QUEUE_GAP_MS))
    return fn()
  })
  chartQueueTail = run.catch(() => {})
  return run
}

// --- Yahoo range → query params mapping ---

const RANGE_CONFIG = {
  '1d':  { range: '1d',  interval: '5m'  },
  '5d':  { range: '5d',  interval: '15m' },
  '1m':  { range: '1mo', interval: '1d'  },
  '3m':  { range: '3mo', interval: '1d'  },
  '6m':  { range: '6mo', interval: '1d'  },
  '1y':  { range: '1y',  interval: '1wk' },
  'ytd': { range: 'ytd', interval: '1d'  },
}

// --- Chart history via /api/chart proxy (Cloud Function in prod, Vite proxy in dev) ---

async function fetchChartHistory(upper, range = '1m') {
  const config = RANGE_CONFIG[range] || RANGE_CONFIG['1m']
  const url = `/api/chart/${encodeURIComponent(upper)}?interval=${config.interval}&range=${config.range}`

  const res = await fetchWithRetry(url)

  if (res.status === 429) {
    throw new ChartError('Chart provider rate limit — try again in a moment.', 'rate_limited')
  }
  if (!res.ok) {
    throw new ChartError(
      `Chart data unavailable (${res.status}). Try again later, or check the ticker symbol.`,
      res.status >= 500 ? 'network' : 'no_data',
    )
  }

  const json = await res.json()
  const result = json.chart?.result?.[0]
  if (!result) {
    const err = json.chart?.error?.description
    throw new ChartError(err || `No chart data for "${upper}".`, 'no_data')
  }

  const timestamps = result.timestamp || []
  const quote = result.indicators?.quote?.[0]
  const closes = quote?.close || []
  const history = []

  const useTime = range === '1d' || range === '5d'

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close == null || Number.isNaN(close)) continue
    const d = new Date(timestamps[i] * 1000)
    history.push({
      date: useTime
        ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : d.toISOString().slice(0, 10),
      close,
    })
  }

  if (history.length === 0) {
    throw new ChartError(`No chart data for "${upper}".`, 'no_data')
  }

  return { symbol: upper, history }
}

// --- Symbol search (Finnhub) — watchlist autocomplete ---

/** Popular index / benchmark ETFs — surfaced when the query looks like an index search. */
const INDEX_ETF_HINTS = [
  {
    symbol: 'SPY',
    description: 'SPDR S&P 500 ETF — tracks the S&P 500 Index',
    type: 'ETF',
  },
  {
    symbol: 'VOO',
    description: 'Vanguard S&P 500 ETF — tracks the S&P 500 Index',
    type: 'ETF',
  },
  {
    symbol: 'IVV',
    description: 'iShares Core S&P 500 ETF — tracks the S&P 500 Index',
    type: 'ETF',
  },
  {
    symbol: 'QQQ',
    description: 'Invesco QQQ — tracks the Nasdaq-100 Index',
    type: 'ETF',
  },
  {
    symbol: 'DIA',
    description: 'SPDR Dow Jones Industrial Average ETF',
    type: 'ETF',
  },
  {
    symbol: 'IWM',
    description: 'iShares Russell 2000 ETF — US small-cap index',
    type: 'ETF',
  },
]

/**
 * When the user types things like "S&P 500", "sp500", or "nasdaq", suggest the right ETFs.
 */
function indexFundHintsForQuery(query) {
  const q = String(query).trim()
  if (q.length < 2) return []

  const u = q.toUpperCase()
  const alnum = u.replace(/[^A-Z0-9]/g, '')

  const out = []
  const addGroup = (symbols) => {
    for (const sym of symbols) {
      const row = INDEX_ETF_HINTS.find((h) => h.symbol === sym)
      if (row) out.push({ ...row })
    }
  }

  const sp500 =
    alnum.includes('SP500') ||
    alnum.includes('SPY') ||
    alnum.includes('VOO') ||
    alnum.includes('IVV') ||
    u.includes('S&P') ||
    u.includes('S & P') ||
    (alnum.includes('SNP') && alnum.includes('500')) ||
    /\bS\s*&\s*P\b/i.test(q) ||
    /S\s+P\s+500/i.test(u)

  if (sp500) {
    addGroup(['SPY', 'VOO', 'IVV'])
  }

  const nasdaq =
    alnum.includes('QQQ') ||
    alnum.includes('NASDAQ100') ||
    alnum.includes('NDX100') ||
    (u.includes('NASDAQ') && (alnum.includes('100') || alnum.includes('NDX')))

  if (nasdaq) {
    addGroup(['QQQ'])
  }

  const dow =
    alnum.includes('DIA') ||
    (u.includes('DOW') && (u.includes('JONES') || alnum.includes('DJIA')))

  if (dow) {
    addGroup(['DIA'])
  }

  const russell =
    alnum.includes('IWM') ||
    (alnum.includes('RUSSELL') && alnum.includes('2000'))

  if (russell) {
    addGroup(['IWM'])
  }

  const deduped = []
  const seen = new Set()
  for (const row of out) {
    if (seen.has(row.symbol)) continue
    seen.add(row.symbol)
    deduped.push(row)
  }
  return deduped
}

/**
 * Search symbols by company name or partial ticker (Finnhub /search).
 * Merges curated index-ETF hints (S&P 500, Nasdaq-100, etc.) with API results.
 * Returns only symbols matching /^[A-Z]{1,5}$/ so they work with the watchlist validator.
 */
export async function searchSymbols(query) {
  const q = String(query).trim()
  if (q.length < 1) return []

  const hints = indexFundHintsForQuery(q)

  if (!FINNHUB_KEY) {
    return hints.slice(0, 12)
  }

  const cacheKey = `symsearch:${q.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const url = `${FINNHUB_BASE}/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`
  const res = await fetch(url)

  if (res.status === 429 || res.status === 503) {
    const merged = mergeHintsWithApi(hints, [])
    setCache(cacheKey, merged)
    return merged
  }
  if (!res.ok) {
    const merged = mergeHintsWithApi(hints, [])
    setCache(cacheKey, merged)
    return merged
  }

  const json = await res.json()
  const list = Array.isArray(json.result) ? json.result : []
  const apiRows = []
  const seen = new Set()

  for (const row of list) {
    const sym = (row.displaySymbol || row.symbol || '').toUpperCase()
    if (!/^[A-Z]{1,5}$/.test(sym)) continue
    if (seen.has(sym)) continue
    seen.add(sym)
    apiRows.push({
      symbol: sym,
      description: row.description ? String(row.description).trim() : sym,
      type: row.type ? String(row.type) : '',
    })
    if (apiRows.length >= 12) break
  }

  const merged = mergeHintsWithApi(hints, apiRows)
  setCache(cacheKey, merged)
  return merged
}

function mergeHintsWithApi(hints, apiRows) {
  const merged = []
  const seen = new Set()

  for (const row of hints) {
    if (seen.has(row.symbol)) continue
    seen.add(row.symbol)
    merged.push(row)
  }
  for (const row of apiRows) {
    if (seen.has(row.symbol)) continue
    seen.add(row.symbol)
    merged.push(row)
    if (merged.length >= 14) break
  }
  return merged
}

// --- Public API ---

export const AVAILABLE_RANGES = ['1d', '5d', '1m', '3m', '6m', '1y', 'ytd']

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
    previousClose: json.pc != null && json.pc > 0 ? json.pc : undefined,
    open: json.o != null && json.o > 0 ? json.o : undefined,
    high: json.h != null && json.h > 0 ? json.h : undefined,
    low: json.l != null && json.l > 0 ? json.l : undefined,
    updatedAt: json.t
      ? new Date(json.t * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  }

  setCache(cacheKey, result)
  return result
}

export async function getHistory(symbol, range = '1m') {
  const upper = normalizeTicker(symbol)

  const memKey = `history:${upper}:${range}`
  const sessionKey = `tradesense:history:${upper}:${range}`

  const memCached = getCached(memKey)
  if (memCached) return memCached

  const sessCached = getSessionCached(sessionKey)
  if (sessCached) {
    setCache(memKey, sessCached)
    return sessCached
  }

  // Deduplicate concurrent requests for the same (symbol, range)
  const flightKey = `${upper}:${range}`
  if (inflightMap.has(flightKey)) {
    return inflightMap.get(flightKey)
  }

  const promise = enqueueChartNetwork(() => fetchChartHistory(upper, range)).then(
    (result) => {
      inflightMap.delete(flightKey)
      setCache(memKey, result)
      setSessionCache(sessionKey, result)
      return result
    },
    (err) => {
      inflightMap.delete(flightKey)
      throw err
    },
  )

  inflightMap.set(flightKey, promise)
  return promise
}
