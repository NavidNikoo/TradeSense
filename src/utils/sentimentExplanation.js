/**
 * Build a short, human-readable explanation of a ticker's sentiment
 * score using the articles + per-article FinBERT results.
 *
 * Returns `{ modeLabel, modeTone, lines, dominantHeadline }`.
 * `lines` is a small array of plain sentences the UI can render as
 * bullets; callers should treat empty strings as "skip this bullet".
 */
export function buildSentimentExplanation({ articles, sentiment, symbol }) {
  if (!sentiment) return null

  const { perArticle = [], aggregate: agg, source } = sentiment
  const n = perArticle.length

  const counts = { positive: 0, neutral: 0, negative: 0 }
  for (const p of perArticle) {
    if (counts[p.label] != null) counts[p.label] += 1
  }

  const mode = describeMode(source)

  if (n === 0) {
    return {
      modeLabel: mode.label,
      modeTone: mode.tone,
      lines: [
        `No recent ${symbol} headlines available to score.`,
      ],
      dominantHeadline: null,
    }
  }

  const lines = []

  lines.push(
    source === 'live'
      ? `Scored the latest ${n} ${symbol} headline${n === 1 ? '' : 's'} with FinBERT (ProsusAI/finbert).`
      : `Showing simulated scores for ${n} ${symbol} headline${n === 1 ? '' : 's'} (FinBERT unavailable).`,
  )

  const breakdown = `${counts.positive} positive, ${counts.neutral} neutral, ${counts.negative} negative.`
  lines.push(`Breakdown: ${breakdown}`)

  lines.push(dominantDirectionSentence(agg, counts))

  const dominantHeadline = pickDominantHeadline(articles, perArticle, agg?.label)

  return {
    modeLabel: mode.label,
    modeTone: mode.tone,
    lines: lines.filter(Boolean),
    dominantHeadline,
  }
}

function describeMode(source) {
  switch (source) {
    case 'live':
      return { label: 'FinBERT: Live', tone: 'positive' }
    case 'stub-no-key':
      return { label: 'Simulated (HF key missing)', tone: 'warn' }
    case 'stub-api-error':
      return { label: 'Simulated (HF API error)', tone: 'warn' }
    case 'stub-fetch-error':
      return { label: 'Simulated (network error)', tone: 'warn' }
    case 'empty':
      return { label: 'No articles', tone: 'neutral' }
    default:
      return { label: 'Unknown source', tone: 'neutral' }
  }
}

function dominantDirectionSentence(agg, counts) {
  if (!agg) return ''
  const total = counts.positive + counts.neutral + counts.negative
  if (total === 0) return ''

  const pctForLabel = (label) =>
    total === 0 ? 0 : Math.round((counts[label] / total) * 100)

  if (agg.label === 'positive') {
    return `Tone skews positive — ${pctForLabel('positive')}% of headlines are optimistic (avg confidence ${agg.score.toFixed(2)}).`
  }
  if (agg.label === 'negative') {
    return `Tone skews negative — ${pctForLabel('negative')}% of headlines are cautious (avg confidence ${agg.score.toFixed(2)}).`
  }
  return `Tone is mostly neutral — news coverage is balanced (avg confidence ${agg.score.toFixed(2)}).`
}

function pickDominantHeadline(articles, perArticle, aggLabel) {
  if (!Array.isArray(articles) || articles.length === 0) return null
  if (!Array.isArray(perArticle) || perArticle.length === 0) return null

  const matching = []
  for (let i = 0; i < articles.length; i++) {
    const s = perArticle[i]
    if (!s) continue
    if (aggLabel && s.label === aggLabel) {
      matching.push({ article: articles[i], score: s.score, label: s.label })
    }
  }

  const pool = matching.length > 0
    ? matching
    : perArticle
        .map((s, i) => ({ article: articles[i], score: s?.score ?? 0, label: s?.label }))
        .filter((x) => x.article)

  pool.sort((a, b) => b.score - a.score)
  const top = pool[0]
  return top ? { title: top.article.title, url: top.article.url, label: top.label } : null
}
