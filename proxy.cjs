const http = require('http')
const https = require('https')

const PORT = 3001

http.createServer((req, res) => {
  if (!req.url.startsWith('/api/chart/')) {
    res.writeHead(404)
    res.end()
    return
  }

  const path = req.url.replace('/api/chart/', '')
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${path}`

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://finance.yahoo.com',
      'Accept': 'application/json',
    },
  }

  https.get(target, options, (yahooRes) => {
    res.writeHead(yahooRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    yahooRes.pipe(res)
  }).on('error', (e) => {
    res.writeHead(500)
    res.end(JSON.stringify({ error: e.message }))
  })
}).listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`)
})