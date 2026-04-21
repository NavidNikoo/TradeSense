/**
 * Pure functions for common technical indicators used on the Dashboard
 * chart.
 *
 * All inputs are arrays of numeric closes (or chart rows with a `close`
 * field). Outputs match the input length and use `null` where there are
 * not yet enough data points to compute the indicator.
 */

function toCloses(series) {
  return series.map((row) => (typeof row === 'number' ? row : row?.close))
}

export function computeSMA(series, period) {
  const closes = toCloses(series)
  const out = new Array(closes.length).fill(null)
  if (!period || period < 1) return out

  let sum = 0
  const window = []

  for (let i = 0; i < closes.length; i++) {
    const v = closes[i]
    if (typeof v !== 'number' || Number.isNaN(v)) {
      window.length = 0
      sum = 0
      out[i] = null
      continue
    }
    window.push(v)
    sum += v
    if (window.length > period) sum -= window.shift()
    if (window.length === period) out[i] = +(sum / period).toFixed(4)
  }
  return out
}

/**
 * Wilder's RSI (classic 14-period). Returns an array of the same length
 * as the input with `null` for the lookback warm-up. Values are in [0, 100].
 */
export function computeRSI(series, period = 14) {
  const closes = toCloses(series)
  const n = closes.length
  const out = new Array(n).fill(null)
  if (n < period + 1) return out

  let gainSum = 0
  let lossSum = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gainSum += diff
    else lossSum -= diff
  }

  let avgGain = gainSum / period
  let avgLoss = lossSum / period

  out[period] = rsiFromAverages(avgGain, avgLoss)

  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    out[i] = rsiFromAverages(avgGain, avgLoss)
  }
  return out
}

function rsiFromAverages(avgGain, avgLoss) {
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return +(100 - 100 / (1 + rs)).toFixed(2)
}

export function rsiZone(rsi) {
  if (rsi == null || Number.isNaN(rsi)) return 'unknown'
  if (rsi >= 70) return 'overbought'
  if (rsi <= 30) return 'oversold'
  return 'neutral'
}

/**
 * Rolling standard deviation of daily simple returns, expressed in
 * percent (std of pct returns * 100). Returns the most recent value.
 */
export function computeVolatility(series, period = 20) {
  const closes = toCloses(series)
  if (closes.length < period + 1) return null

  const returns = []
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]
    const cur = closes[i]
    if (typeof prev !== 'number' || typeof cur !== 'number' || prev === 0) continue
    returns.push((cur - prev) / prev)
  }
  if (returns.length < period) return null

  const window = returns.slice(-period)
  const mean = window.reduce((a, b) => a + b, 0) / window.length
  const variance = window.reduce((acc, r) => acc + (r - mean) ** 2, 0) / window.length
  return +(Math.sqrt(variance) * 100).toFixed(2)
}

export function volatilityTier(pct) {
  if (pct == null) return 'unknown'
  if (pct < 1) return 'low'
  if (pct < 2.5) return 'medium'
  return 'high'
}

/**
 * Returns a new chart-data array with `sma20`, `sma50`, and `rsi14`
 * attached to each row (null during the warm-up period). Keeps the
 * original objects intact.
 */
export function enrichChartData(chartData) {
  if (!Array.isArray(chartData) || chartData.length === 0) return chartData

  const sma20 = computeSMA(chartData, 20)
  const sma50 = computeSMA(chartData, 50)
  const rsi14 = computeRSI(chartData, 14)

  return chartData.map((row, i) => ({
    ...row,
    sma20: sma20[i],
    sma50: sma50[i],
    rsi14: rsi14[i],
  }))
}

/**
 * Summarize the latest technical picture for display (chips, tooltips).
 * `null` fields simply won't be rendered.
 */
export function summarizeIndicators(enriched) {
  if (!Array.isArray(enriched) || enriched.length === 0) return null
  const last = enriched[enriched.length - 1]
  const vol = computeVolatility(enriched, 20)
  return {
    rsi: last.rsi14 ?? null,
    rsiZone: rsiZone(last.rsi14),
    sma20: last.sma20 ?? null,
    sma50: last.sma50 ?? null,
    volatility: vol,
    volatilityTier: volatilityTier(vol),
  }
}
