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

// --- Stub data for when no API key is configured ---

function stubArticles(symbol) {
  const now = new Date()
  return {
    symbol: symbol.toUpperCase(),
    articles: [
      {
        title: `${symbol.toUpperCase()} posts stronger-than-expected quarterly earnings`,
        summary: 'Revenue beat analyst estimates amid strong consumer demand.',
        source: 'Reuters',
        url: '#',
        publishedAt: new Date(now - 1 * 3600000).toISOString(),
      },
      {
        title: `Analysts upgrade ${symbol.toUpperCase()} citing growth momentum`,
        summary: 'Multiple Wall Street firms raise price targets for the stock.',
        source: 'Bloomberg',
        url: '#',
        publishedAt: new Date(now - 4 * 3600000).toISOString(),
      },
      {
        title: `${symbol.toUpperCase()} announces new product line expansion`,
        summary: 'The company plans to enter new markets in the coming quarter.',
        source: 'CNBC',
        url: '#',
        publishedAt: new Date(now - 8 * 3600000).toISOString(),
      },
      {
        title: `Market volatility impacts ${symbol.toUpperCase()} trading volume`,
        summary: 'Trading volume surged as investors reacted to macroeconomic data.',
        source: 'MarketWatch',
        url: '#',
        publishedAt: new Date(now - 14 * 3600000).toISOString(),
      },
      {
        title: `Institutional investors increase holdings in ${symbol.toUpperCase()}`,
        summary: 'SEC filings reveal major fund managers added positions.',
        source: 'Financial Times',
        url: '#',
        publishedAt: new Date(now - 24 * 3600000).toISOString(),
      },
    ],
  }
}

// --- Public API ---

export async function getNews(symbol) {
  const upper = normalizeTicker(symbol)

  if (!FINNHUB_KEY) return stubArticles(upper)

  const cacheKey = `news:${upper}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const to = new Date().toISOString().slice(0, 10)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 7)
    const from = fromDate.toISOString().slice(0, 10)

    const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(upper)}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
    const res = await fetch(url)
    const json = await res.json()

    if (!Array.isArray(json) || json.length === 0) {
      return stubArticles(upper)
    }

    const articles = json.slice(0, 8).map((item) => ({
      title: item.headline,
      summary: item.summary || '',
      source: item.source || '',
      url: item.url,
      publishedAt: item.datetime
        ? new Date(item.datetime * 1000).toISOString()
        : new Date().toISOString(),
    }))

    const result = { symbol: upper, articles }
    setCache(cacheKey, result)
    return result
  } catch {
    return stubArticles(upper)
  }
}
