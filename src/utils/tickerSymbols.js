/**
 * Common user typos / aliases → valid US ticker symbols for market APIs.
 */
const TYPOS = {
  APPL: 'AAPL',
}

export function normalizeTicker(symbol) {
  const upper = String(symbol).trim().toUpperCase()
  return TYPOS[upper] || upper
}
