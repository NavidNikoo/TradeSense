const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')

const PORT = 3001

function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const HF_KEY =
  process.env.HUGGINGFACE_API_KEY ||
  process.env.VITE_HUGGINGFACE_API_KEY ||
  ''
const HF_MODEL = 'ProsusAI/finbert'
// NOTE: `api-inference.huggingface.co` was decommissioned in late 2025.
// The new HF Inference provider lives behind the router URL below.
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`

function writeCors(res, status, extraHeaders = {}) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...extraHeaders,
  })
}

function handleChart(req, res) {
  const symPath = req.url.replace('/api/chart/', '')
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${symPath}`

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://finance.yahoo.com',
      'Accept': 'application/json',
    },
  }

  https
    .get(target, options, (yahooRes) => {
      writeCors(res, yahooRes.statusCode || 200, { 'Content-Type': 'application/json' })
      yahooRes.pipe(res)
    })
    .on('error', (e) => {
      writeCors(res, 500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    })
}

function handleFinbert(req, res) {
  if (req.method !== 'POST') {
    writeCors(res, 405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!HF_KEY) {
    writeCors(res, 503, { 'Content-Type': 'application/json' })
    return res.end(
      JSON.stringify({
        error:
          'HuggingFace key missing on server. Set HUGGINGFACE_API_KEY (or VITE_HUGGINGFACE_API_KEY) in .env and restart proxy.cjs.',
      }),
    )
  }

  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8')

    const upstream = https.request(
      HF_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      (hfRes) => {
        writeCors(res, hfRes.statusCode || 200, {
          'Content-Type': hfRes.headers['content-type'] || 'application/json',
        })
        hfRes.pipe(res)
      },
    )
    upstream.on('error', (e) => {
      writeCors(res, 502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    })
    upstream.write(body)
    upstream.end()
  })
}

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      writeCors(res, 204)
      return res.end()
    }

    if (req.url.startsWith('/api/chart/')) return handleChart(req, res)
    if (req.url === '/api/finbert' || req.url.startsWith('/api/finbert?')) return handleFinbert(req, res)

    writeCors(res, 404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })
  .listen(PORT, () => {
    console.log(`Proxy running on http://localhost:${PORT}`)
    console.log(
      HF_KEY
        ? '  • /api/finbert: HuggingFace key loaded'
        : '  • /api/finbert: NO key found (set HUGGINGFACE_API_KEY or VITE_HUGGINGFACE_API_KEY)',
    )
  })
