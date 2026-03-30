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

**Free-tier limits:** 60 API calls/minute for quote and company-news. **Historical candle charts (`/stock/candle`) are not included on the free tier** (Finnhub returns 403). TradeSense loads **daily chart history from Yahoo Finance** instead (same-origin proxy in dev; direct request in production builds).

**Ticker typos:** `APPL` is automatically corrected to **`AAPL`** (Apple).

**Troubleshooting “No market-data API key”:** Vite reads `.env` from disk only. Save the file after editing, then restart `npm run dev`. The line must look like `VITE_FINNHUB_API_KEY=yourkey` with **no space** around `=` and a non-empty value after `=`. If the variable is empty, the app cannot see your key even if it appears in the editor (unsaved buffer).

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
    marketDataService.js   (Finnhub — quotes + chart history)
    newsService.js         (Finnhub — company news)
    sentimentService.js    (Hugging Face FinBERT)
    timeLapseService.js    (Firestore)
    watchlistService.js    (Firestore)
```
