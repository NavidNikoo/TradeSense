# TradeSense (CPSC 491)

TradeSense is a sentiment-aware stock dashboard for the CPSC 491 capstone project.
This base setup includes:

- React + Vite project scaffold
- Firebase initialization (Auth + Firestore placeholders)
- Email/password authentication flow
- Protected routes and app layout
- Dashboard and Watchlist placeholders

## 1) Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173` by default.

## 2) Required Firebase setup (Lead)

1. Create a Firebase project in the Firebase Console.
2. Add a web app and copy config values into `.env`.
3. Enable **Authentication > Sign-in method > Email/Password**.
4. Create **Firestore Database** (start in test mode for initial local dev).
5. (Recommended) Add basic Firestore rules before team testing.

### Suggested Firestore collections (MVP)

- `users/{userId}`
- `watchlists/{userId}` with field `symbols: string[]`
- `time_lapse/{docId}` for sentiment snapshots

## 3) Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 4) Current app routes

- `/login`
- `/signup`
- `/dashboard` (protected)
- `/watchlist` (protected)

## 5) Team handoff tasks

- **Dev A:** Auth UI polish + error handling improvements
- **Dev B:** Dashboard UI components + charting shell
- **Dev C:** Firestore watchlist CRUD (`add/remove/reorder`)
- **Lead:** Sentiment pipeline + Time-Lapse schema + deployment

## 6) Project structure

```text
src/
  contexts/
    AuthContext.jsx
  firebase/
    config.js
  layouts/
    AppLayout.jsx
  pages/
    LoginPage.jsx
    SignupPage.jsx
    DashboardPage.jsx
    WatchlistPage.jsx
  routes/
    AppRouter.jsx
    ProtectedRoute.jsx
```
