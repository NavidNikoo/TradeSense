const API_KEY = import.meta.env.VITE_MARKET_DATA_API_KEY
const BASE = 'https://www.alphavantage.co/query'

function generateMockHistory(days = 30) {
  const history = []
  let price = 170 + Math.random() * 30

  for (let i = days; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    price += (Math.random() - 0.48) * 3
    history.push({ date: d.toISOString().slice(0, 10), close: +price.toFixed(2) })
  }

  return history
}

const MOCK_QUOTE = {
  AAPL: { symbol: 'AAPL', price: 189.84, changePercent: 1.23 },
  NVDA: { symbol: 'NVDA', price: 875.28, changePercent: -0.45 },
  TSLA: { symbol: 'TSLA', price: 196.37, changePercent: 2.04 },
  MSFT: { symbol: 'MSFT', price: 410.52, changePercent: 0.33 },
  AMZN: { symbol: 'AMZN', price: 182.15, changePercent: -0.78 },
  GOOGL: { symbol: 'GOOGL', price: 165.49, changePercent: 0.61 },
}

function stubQuote(symbol) {
  const upper = symbol.toUpperCase()
  if (MOCK_QUOTE[upper]) return MOCK_QUOTE[upper]

  return {
    symbol: upper,
    price: +(100 + Math.random() * 200).toFixed(2),
    changePercent: +((Math.random() - 0.5) * 4).toFixed(2),
  }
}

export async function getQuote(symbol) {
  if (!API_KEY) return stubQuote(symbol)

  try {
    const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`
    const res = await fetch(url)
    const json = await res.json()
    const q = json['Global Quote']

    if (!q || !q['05. price']) return stubQuote(symbol)

    return {
      symbol: q['01. symbol'] || symbol.toUpperCase(),
      price: parseFloat(q['05. price']),
      changePercent: parseFloat(q['10. change percent']),
      updatedAt: q['07. latest trading day'],
    }
  } catch {
    return stubQuote(symbol)
  }
}

export async function getHistory(symbol, range = '1m') {
  if (!API_KEY) {
    const days = range === '3m' ? 90 : 30
    return { symbol: symbol.toUpperCase(), history: generateMockHistory(days) }
  }

  try {
    const url = `${BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${API_KEY}`
    const res = await fetch(url)
    const json = await res.json()
    const series = json['Time Series (Daily)']

    if (!series) {
      return { symbol: symbol.toUpperCase(), history: generateMockHistory() }
    }

    const days = range === '3m' ? 90 : 30
    const history = Object.entries(series)
      .slice(0, days)
      .reverse()
      .map(([date, values]) => ({
        date,
        close: parseFloat(values['4. close']),
      }))

    return { symbol: symbol.toUpperCase(), history }
  } catch {
    return { symbol: symbol.toUpperCase(), history: generateMockHistory() }
  }
}
