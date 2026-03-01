const HF_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY
const MODEL = 'ProsusAI/finbert'
const HF_URL = `https://api-inference.huggingface.co/models/${MODEL}`

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

export async function scoreArticles(articles) {
  if (!articles || articles.length === 0) {
    return { perArticle: [], aggregate: { label: 'neutral', score: 0 } }
  }

  if (!HF_KEY) {
    const perArticle = articles.map(() => stubScore())
    return { perArticle, aggregate: aggregate(perArticle) }
  }

  try {
    const inputs = articles.map((a) =>
      a.summary ? `${a.title}. ${a.summary}` : a.title,
    )

    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs }),
    })

    if (!res.ok) {
      const perArticle = articles.map(() => stubScore())
      return { perArticle, aggregate: aggregate(perArticle) }
    }

    const json = await res.json()

    const perArticle = json.map((resultSet) => {
      // Each result is an array of [{label, score}, ...] sorted by score desc
      const top = Array.isArray(resultSet) ? resultSet[0] : resultSet
      return {
        label: top.label.toLowerCase(),
        score: +top.score.toFixed(3),
      }
    })

    return { perArticle, aggregate: aggregate(perArticle) }
  } catch {
    const perArticle = articles.map(() => stubScore())
    return { perArticle, aggregate: aggregate(perArticle) }
  }
}
