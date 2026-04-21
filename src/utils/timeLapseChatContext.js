/**
 * Normalize Firestore Timestamp, plain ISO strings, or { seconds } objects to ISO string.
 */
function normalizeTimestamp(ts) {
  if (ts == null) return null
  if (typeof ts === 'string') return ts
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString()
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000).toISOString()
  return String(ts)
}

/**
 * Builds a minimal context payload for the timeLapseChat HTTP function.
 * Keeps only what the model needs — no raw Firestore references.
 */
export function buildTimeLapseChatContext({ symbol, startDate, endDate, snapshots, insights }) {
  return {
    symbol,
    dateRange: { from: startDate, to: endDate },
    snapshots: snapshots.map((s) => ({
      timestamp: normalizeTimestamp(s.timestamp),
      priceClose: s.priceSnapshot?.close ?? null,
      changePercent: s.priceSnapshot?.changePercent ?? null,
      sentimentLabel: s.sentimentSummary?.label || 'unknown',
      sentimentScore: s.sentimentSummary?.score ?? null,
    })),
    ruleBasedInsights: insights
      ? {
          headline: insights.headline,
          bullets: insights.bullets.map((b) => b.text),
        }
      : null,
  }
}
