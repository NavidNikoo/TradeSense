const SENTIMENT_ORDER = { negative: -1, neutral: 0, unknown: 0, positive: 1 }

function sentDir(label) {
  return SENTIMENT_ORDER[label] ?? 0
}

function sameCalendarDay(isoA, isoB) {
  return new Date(isoA).toDateString() === new Date(isoB).toDateString()
}

function fmtMoney(v) {
  if (v == null) return null
  const sign = v >= 0 ? '+' : ''
  return `${sign}$${Math.abs(v).toFixed(2)}`
}

function fmtPct(v) {
  if (v == null) return null
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

/**
 * Build structured insights from an ascending-sorted array of snapshots.
 * Returns { headline, bullets: { text, tone }[], disclaimer }.
 * Pure function — no side effects, never throws.
 */
export function buildTimeLapseInsights(snapshots, symbol) {
  const n = snapshots.length
  const bullets = []

  if (n === 0) {
    return {
      headline: 'No data yet',
      bullets: [{ text: 'Load snapshots for a symbol to see insights here.', tone: 'info' }],
      disclaimer: null,
    }
  }

  if (n === 1) {
    return {
      headline: `1 snapshot for ${symbol}`,
      bullets: [
        { text: 'Save another snapshot from the Dashboard to unlock trend analysis.', tone: 'info' },
      ],
      disclaimer: 'Insights are based on your manually saved snapshots, not full market history.',
    }
  }

  const first = snapshots[0]
  const last = snapshots[n - 1]

  const firstClose = first.priceSnapshot?.close
  const lastClose = last.priceSnapshot?.close
  const firstLabel = first.sentimentSummary?.label || 'unknown'
  const lastLabel = last.sentimentSummary?.label || 'unknown'
  const firstScore = first.sentimentSummary?.score
  const lastScore = last.sentimentSummary?.score

  const headline = `${symbol} across ${n} snapshots`

  // Intraday flag
  if (sameCalendarDay(first.timestamp, last.timestamp)) {
    bullets.push({
      text: 'All snapshots fall on the same calendar day — this is an intraday comparison.',
      tone: 'info',
    })
  }

  // Price delta
  let priceDelta = null
  let pricePct = null
  if (firstClose != null && lastClose != null) {
    priceDelta = lastClose - firstClose
    pricePct = firstClose !== 0 ? (priceDelta / firstClose) * 100 : null

    const dir = priceDelta > 0.005 ? 'up' : priceDelta < -0.005 ? 'down' : 'flat'
    const tone = dir === 'up' ? 'positive' : dir === 'down' ? 'negative' : 'neutral'
    const money = fmtMoney(priceDelta)
    const pct = fmtPct(pricePct)
    bullets.push({
      text: dir === 'flat'
        ? `Price was effectively flat between first and last snapshot ($${firstClose.toFixed(2)}).`
        : `Price moved ${money}${pct ? ` (${pct})` : ''} from $${firstClose.toFixed(2)} to $${lastClose.toFixed(2)}.`,
      tone,
    })
  }

  // Sentiment shift
  if (firstLabel !== lastLabel) {
    bullets.push({
      text: `Sentiment shifted from ${firstLabel} to ${lastLabel}.`,
      tone: sentDir(lastLabel) > sentDir(firstLabel) ? 'positive' : sentDir(lastLabel) < sentDir(firstLabel) ? 'negative' : 'neutral',
    })
  } else {
    bullets.push({
      text: `Sentiment stayed ${firstLabel} across the range.`,
      tone: 'neutral',
    })
  }

  // Score delta (secondary)
  if (typeof firstScore === 'number' && typeof lastScore === 'number') {
    const sd = lastScore - firstScore
    if (Math.abs(sd) > 0.01) {
      bullets.push({
        text: `Sentiment score moved ${sd > 0 ? '+' : ''}${sd.toFixed(3)} (${firstScore.toFixed(3)} → ${lastScore.toFixed(3)}).`,
        tone: 'info',
      })
    }
  }

  // Alignment / divergence heuristic
  const priceFlat = priceDelta != null && Math.abs(priceDelta) < 0.01
  const sentimentMoved = firstLabel !== lastLabel
  const priceDir = priceDelta > 0.005 ? 1 : priceDelta < -0.005 ? -1 : 0
  const sentimentDir = sentDir(lastLabel) - sentDir(firstLabel)

  if (priceFlat && sentimentMoved) {
    bullets.push({
      text: 'Price stayed flat while sentiment shifted — watch for potential delayed price reaction.',
      tone: 'info',
    })
  } else if (priceDelta != null && !priceFlat && sentimentMoved) {
    if ((priceDir > 0 && sentimentDir > 0) || (priceDir < 0 && sentimentDir < 0)) {
      bullets.push({
        text: 'Price and sentiment moved in the same direction — signals are aligned.',
        tone: 'positive',
      })
    } else if ((priceDir > 0 && sentimentDir < 0) || (priceDir < 0 && sentimentDir > 0)) {
      bullets.push({
        text: 'Price and sentiment diverged — one moved up while the other moved down.',
        tone: 'negative',
      })
    }
  }

  return {
    headline,
    bullets,
    disclaimer: 'Insights are based on your manually saved snapshots, not full market history.',
  }
}
