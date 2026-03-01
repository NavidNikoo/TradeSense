# Service Contracts (MVP)

These interfaces keep frontend components decoupled from provider-specific APIs.

## MarketDataService

- `getQuote(symbol: string): Promise<{ symbol: string; price: number; changePercent?: number; updatedAt?: string }>`
- `getHistory(symbol: string, range: string): Promise<{ symbol: string; history: { date: string; close: number }[] }>`

## NewsService

- `getNews(symbol: string): Promise<{ symbol: string; articles: { title: string; summary?: string; source?: string; url: string; publishedAt: string }[] }>`

## SentimentService

- `scoreArticles(articles: { title: string; summary?: string }[]): Promise<{ perArticle: { label: 'positive' | 'neutral' | 'negative'; score: number }[]; aggregate: { label: 'positive' | 'neutral' | 'negative'; score: number } }>`

## WatchlistService

- `getWatchlist(userId: string): Promise<{ userId: string; symbols: string[] }>`
- `addSymbol(userId: string, symbol: string): Promise<void>`
- `removeSymbol(userId: string, symbol: string): Promise<void>`
- `reorderSymbols(userId: string, symbols: string[]): Promise<void>`

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
