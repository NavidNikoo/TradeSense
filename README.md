# TradeSense (CPSC 491)

TradeSense is a sentiment-aware stock dashboard for the CPSC 491 capstone project.

- React + Vite project scaffold
- Firebase initialization (Auth + Firestore)
- Email/password authentication flow
- Protected routes and app layout
- Dashboard with live stock prices, charts, news, and sentiment
- Watchlist management (add, remove, reorder)
- Time-Lapse sentiment snapshots

## 1) Local setup

```bash
npm install
cp .env.example .env   # then fill in your keys (see below)
npm run dev
```

App runs at `http://localhost:5173` by default.

## 2) API keys

### Finnhub (stock prices + charts + news) — required

1. Go to [https://finnhub.io/register](https://finnhub.io/register) and sign up (free, no credit card).
2. Copy your API key from the dashboard.
3. Paste it into `.env`:
   ```
   VITE_FINNHUB_API_KEY=your_key_here
   ```

**Free-tier limits:** 60 API calls/minute for quote and company-news. **Historical candle charts (`/stock/candle`) are not included on the free tier** (Finnhub returns 403). TradeSense loads daily chart history from Yahoo Finance via `/api/chart`. In dev, Vite proxies this path to Yahoo; in production, a Firebase Cloud Function (`functions/index.js`) proxies and caches the data server-side (15-min TTL) to avoid browser CORS and rate-limit issues.

**Chart ranges:** 1D, 5D, 1M, 3M, 6M, 1Y, YTD are supported. Each range maps to the appropriate Yahoo interval (5m for intraday, 1d for daily, 1wk for 1Y).

### Deploying the chart proxy

```bash
cd functions && npm install
cd ..
firebase deploy --only functions,hosting
```

The Cloud Function `chartProxy` is wired via a Hosting rewrite in `firebase.json` so `/api/chart/*` requests go through it. No extra env vars needed — the function fetches Yahoo server-side.

**Ticker typos:** `APPL` is automatically corrected to **`AAPL`** (Apple).

**Troubleshooting “No market-data API key”:** Vite reads `.env` from disk only. Save the file after editing, then restart `npm run dev`. The line must look like `VITE_FINNHUB_API_KEY=yourkey` with **no space** around `=` and a non-empty value after `=`. If the variable is empty, the app cannot see your key even if it appears in the editor (unsaved buffer).

**Chart "Rate limited" (429) in development:** During local development (`npm run dev`), chart requests are proxied directly to Yahoo Finance through your browser's IP. Yahoo may throttle after several rapid range changes or page refreshes. When this happens the panel shows a fallback 2-point chart (prev close vs current price) and retries once automatically. In production, the Firebase Cloud Function proxy (`functions/index.js`) caches responses for 15 minutes server-side and uses a different IP, so 429 errors are much rarer. If you see persistent 429s locally, wait 30-60 seconds or rely on the fallback chart.

### Firebase — required

1. Create a Firebase project in the Firebase Console.
2. Add a web app and copy config values into `.env`.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Create **Firestore Database** (start in test mode for initial local dev).

### Hugging Face (optional — sentiment analysis)

1. Sign up at [https://huggingface.co](https://huggingface.co).
2. Create an access token and paste into `.env`:
   ```
   VITE_HUGGINGFACE_API_KEY=hf_...
   ```

### OpenAI — Time-Lapse AI Chat (optional)

The Time-Lapse page includes an AI chat grounded in your saved snapshots. The browser calls **`/api/timelapse-chat`**, which Firebase Hosting rewrites to the Cloud Function **`timeLapseChatHttp`**. Your OpenAI key stays on the server (Firebase secret), not in Vite.

1. Get an API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Store it as a Firebase secret (not in `.env`):
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```
3. Deploy the function **and** update Hosting rewrites (first-time setup for this feature):
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions,hosting
   ```

**Local dev (`npm run dev`):** `vite.config.js` proxies `/api/timelapse-chat` to `https://us-central1-<VITE_FIREBASE_PROJECT_ID>.cloudfunctions.net/timeLapseChatHttp`. Your `.env` must include **`VITE_FIREBASE_PROJECT_ID`** (and the function must be deployed) so the dev server can reach the backend.

The chat uses `gpt-4o-mini`. If the secret is missing, invalid, or the function is not deployed, the UI shows the server error message instead of a generic failure.

## 3) Valid ticker symbols

Use **standard US stock tickers**, not full company names:

| Company         | Ticker |
| --------------- | ------ |
| Apple           | AAPL   |
| Microsoft       | MSFT   |
| Lockheed Martin | LMT    |
| Beyond Meat     | BYND   |
| S&P 500 ETF    | SPY    |
| Tesla           | TSLA   |
| Nvidia          | NVDA   |

If you enter "LOCKHEED MARTIN" instead of "LMT", you'll get an error because that's not a valid ticker symbol.

Recommended watchlist size: **5 symbols or fewer** for the free tier.

## 4) Scripts

- `npm run dev` — Start development server
- `npm run build` — Build production bundle
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

## 5) Current app routes

- `/` — Public landing page (marketing)
- `/homepage` — Redirects to `/` (keeps old links working)
- `/login`
- `/signup`
- `/dashboard` (protected)
- `/watchlist` (protected)
- `/time-lapse` (protected)

## 6) Firebase collections (MVP)

- `users/{userId}`
- `watchlists/{userId}` with field `symbols: string[]`
- `time_lapse/{docId}` for sentiment snapshots

## 7) Project structure

```text
functions/
  index.js               (Firebase Cloud Function — Yahoo chart proxy with cache)
  package.json
src/
  components/
    NavBar.jsx
    TickerPanel.jsx
  contexts/
    AuthContext.jsx
  firebase/
    config.js
  hooks/
    useWatchlist.js
  layouts/
    AppLayout.jsx
  pages/
    HomePage.jsx
    LoginPage.jsx
    SignupPage.jsx
    DashboardPage.jsx
    WatchlistPage.jsx
    TimeLapsePage.jsx
    NotFoundPage.jsx
  routes/
    AppRouter.jsx
    ProtectedRoute.jsx
  services/
    marketDataService.js   (Finnhub quotes + chart via /api/chart proxy)
    newsService.js         (Finnhub — company news)
    sentimentService.js    (Hugging Face FinBERT)
    timeLapseService.js    (Firestore)
    watchlistService.js    (Firestore)
```
