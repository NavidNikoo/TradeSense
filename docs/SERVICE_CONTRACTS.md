# Service Contracts (MVP)

These interfaces keep frontend components decoupled from provider-specific APIs.

## MarketDataService

- `getQuote(symbol: string): Promise<{ symbol: string; price: number; changePercent?: number; updatedAt?: string; previousClose?: number; open?: number; high?: number; low?: number }>`
- `getHistory(symbol: string, range: string): Promise<{ symbol: string; history: { date: string; close: number }[] }>`
  - `range` is one of `'1d' | '5d' | '1m' | '3m' | '6m' | '1y' | 'ytd'`.
  - Client retries up to 2× on HTTP 429/503 with exponential backoff.
  - Results are cached in `sessionStorage` (20 min TTL) in addition to memory cache (5 min TTL).
  - Underlying data comes from Yahoo Finance chart API via `/api/chart/{symbol}` (proxied by Vite in dev, Firebase Cloud Function in production with server-side 10-min cache).

## NewsService

- `getNews(symbol: string): Promise<{ symbol: string; articles: { title: string; summary?: string; source?: string; url: string; publishedAt: string }[] }>`

## SentimentService

- `scoreArticles(articles: { title: string; summary?: string }[]): Promise<{ perArticle: { label: 'positive' | 'neutral' | 'negative'; score: number }[]; aggregate: { label: 'positive' | 'neutral' | 'negative'; score: number } }>`

## WatchlistService

- `getWatchlist(userId: string): Promise<{ userId: string; symbols: string[] }>`
- `addSymbol(userId: string, symbol: string): Promise<void>`
- `removeSymbol(userId: string, symbol: string): Promise<void>`
- `reorderSymbols(userId: string, symbols: string[]): Promise<void>`

## Chart Proxy (Cloud Function)

- `GET /api/chart/{symbol}?range={range}&interval={interval}`
  - Proxies Yahoo Finance `/v8/finance/chart` and caches responses server-side (10-min TTL per symbol+range+interval key).
  - Returns raw Yahoo JSON; the client parses timestamps and close prices.
  - Retries up to 3× on 429/503 with exponential backoff.
  - Response header `X-Cache: HIT | MISS` indicates cache status.
  - Defined in `functions/index.js`; wired via Firebase Hosting rewrite in `firebase.json`.

## Time-Lapse Snapshot Schema

Collection: `time_lapse`

```json
{
  "userId": "firebase_uid",
  "symbol": "AAPL",
  "timestamp": "2026-02-28T20:00:00.000Z",
  "sentimentSummary": {
    "label": "positive",
    "score": 0.71
  },
  "priceSnapshot": {
    "close": 192.15,
    "changePercent": 1.22
  },
  "articleRefs": [
    "news-item-id-1",
    "news-item-id-2"
  ]
}
```
