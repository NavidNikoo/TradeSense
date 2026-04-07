const { onRequest } = require("firebase-functions/v2/https");

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

// In-memory cache: key → { data, ts }
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const cache = new Map();

function evictStale() {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.ts > CACHE_TTL_MS) cache.delete(k);
  }
}

async function fetchWithRetry(url, retries = 3, delayMs = 600) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 || res.status === 503) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
    }
    return res;
  }
  throw new Error("Retries exhausted");
}

exports.chartProxy = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Path: /api/chart/AAPL or /AAPL — extract last non-empty segment as symbol
  const parts = req.path.split("/").filter(Boolean);
  const symbol = (parts[parts.length - 1] || "").toUpperCase();

  if (!symbol || !/^[A-Z]{1,5}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid or missing ticker symbol" });
  }

  const range = req.query.range || "1mo";
  const interval = req.query.interval || "1d";
  const cacheKey = `${symbol}:${range}:${interval}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "public, max-age=120");
    return res.json(cached.data);
  }

  const yahooUrl = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=false`;

  try {
    const upstream = await fetchWithRetry(yahooUrl);
    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    cache.set(cacheKey, { data, ts: Date.now() });
    evictStale();

    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "public, max-age=120");
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to fetch chart data" });
  }
});
