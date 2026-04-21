// The HuggingFace inference endpoint cannot be called from a browser
// (CORS is not enabled on api-inference.huggingface.co), so we always go
// through our server-side proxy at `/api/finbert`:
//   • localhost dev → proxy.cjs (port 3001) via Vite proxy
//   • production    → finbertProxy Cloud Function via Firebase Hosting rewrite
// The HF API key lives on the server; the browser never sees it.

const FINBERT_URL = '/api/finbert'

function stubScore() {
  const labels = ['positive', 'neutral', 'negative']
  const weights = [0.45, 0.35, 0.2]
  const r = Math.random()

  let label
  if (r < weights[0]) label = labels[0]
  else if (r < weights[0] + weights[1]) label = labels[1]
  else label = labels[2]

  return { label, score: +(0.5 + Math.random() * 0.45).toFixed(3) }
}

function aggregate(perArticle) {
  if (perArticle.length === 0) return { label: 'neutral', score: 0 }

  const totals = { positive: 0, neutral: 0, negative: 0 }

  for (const item of perArticle) {
    totals[item.label] += item.score
  }

  const best = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]

  return {
    label: best[0],
    score: +(best[1] / perArticle.length).toFixed(3),
  }
}

function stubResult(articles, source) {
  const perArticle = articles.map(() => stubScore())
  return { perArticle, aggregate: aggregate(perArticle), source }
}

/**
 * Score an array of news articles with FinBERT via our server-side proxy.
 *
 * Returns `{ perArticle, aggregate, source }` where `source` is one of:
 *   'live'              FinBERT scored the articles successfully.
 *   'stub-no-key'       Proxy reported HF key is missing (503).
 *   'stub-api-error'    Proxy/HF returned a non-OK status.
 *   'stub-fetch-error'  Network or parsing failure.
 *   'empty'             No articles to score.
 */
export async function scoreArticles(articles) {
  if (!articles || articles.length === 0) {
    return { perArticle: [], aggregate: { label: 'neutral', score: 0 }, source: 'empty' }
  }

  const inputs = articles.map((a) => (a.summary ? `${a.title}. ${a.summary}` : a.title))

  let res
  try {
    res = await fetch(FINBERT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `top_k: null` tells the new HF router to return the full label
      // distribution per input (positive / neutral / negative) instead of
      // only the single top label.
      body: JSON.stringify({ inputs, parameters: { top_k: null } }),
    })
  } catch {
    return stubResult(articles, 'stub-fetch-error')
  }

  if (res.status === 503) {
    return stubResult(articles, 'stub-no-key')
  }
  if (!res.ok) {
    return stubResult(articles, 'stub-api-error')
  }

  let json
  try {
    json = await res.json()
  } catch {
    return stubResult(articles, 'stub-fetch-error')
  }

  if (!Array.isArray(json) || json.length !== articles.length) {
    return stubResult(articles, 'stub-api-error')
  }

  try {
    const perArticle = json.map((resultSet) => {
      const top = Array.isArray(resultSet) ? resultSet[0] : resultSet
      return {
        label: String(top.label).toLowerCase(),
        score: +Number(top.score).toFixed(3),
      }
    })
    return { perArticle, aggregate: aggregate(perArticle), source: 'live' }
  } catch {
    return stubResult(articles, 'stub-api-error')
  }
}
