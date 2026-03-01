const API_KEY = import.meta.env.VITE_NEWS_API_KEY
const BASE = 'https://www.alphavantage.co/query'

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

export async function getNews(symbol) {
  if (!API_KEY) return stubArticles(symbol)

  try {
    const url = `${BASE}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}&limit=8&apikey=${API_KEY}`
    const res = await fetch(url)
    const json = await res.json()
    const feed = json.feed

    if (!feed || feed.length === 0) return stubArticles(symbol)

    const articles = feed.slice(0, 8).map((item) => ({
      title: item.title,
      summary: item.summary || '',
      source: item.source || '',
      url: item.url,
      publishedAt: item.time_published
        ? formatAlphaVantageDate(item.time_published)
        : new Date().toISOString(),
    }))

    return { symbol: symbol.toUpperCase(), articles }
  } catch {
    return stubArticles(symbol)
  }
}

function formatAlphaVantageDate(raw) {
  // Alpha Vantage format: 20260228T143000
  const y = raw.slice(0, 4)
  const m = raw.slice(4, 6)
  const d = raw.slice(6, 8)
  const h = raw.slice(9, 11)
  const min = raw.slice(11, 13)
  const s = raw.slice(13, 15)

  return `${y}-${m}-${d}T${h}:${min}:${s}Z`
}
