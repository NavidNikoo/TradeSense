import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <section className="settings-page">
      <header className="settings-header">
        <h1>Settings</h1>
        <p className="muted-label">
          Account details and preferences for TradeSense on this device.
        </p>
      </header>

      <div className="settings-grid">
        <article className="settings-card">
          <h2 className="settings-card-title">Appearance</h2>
          <p className="settings-card-desc muted-label">
            Choose light or dark mode. This is saved in your browser only.
          </p>
          <div className="settings-segment" role="group" aria-label="Color theme">
            <button
              type="button"
              className={`settings-segment-btn${theme === 'light' ? ' is-active' : ''}`}
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              type="button"
              className={`settings-segment-btn${theme === 'dark' ? ' is-active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
          </div>
          <p className="settings-hint muted-label">
            You can also use the sun / moon button in the top bar for a quick switch.
          </p>
        </article>

        <article className="settings-card">
          <h2 className="settings-card-title">Account</h2>
          <p className="settings-card-desc muted-label">
            You are signed in with Firebase Authentication.
          </p>
          <dl className="settings-dl">
            <div>
              <dt>Email</dt>
              <dd>{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd className="settings-mono">{user?.uid ?? '—'}</dd>
            </div>
          </dl>
        </article>

        <article className="settings-card">
          <h2 className="settings-card-title">Data &amp; APIs</h2>
          <p className="settings-card-desc muted-label">
            Quotes and news come from Finnhub; chart history is loaded via the app&apos;s chart proxy.
            Sentiment uses a Hugging Face model. Nothing here leaves your team&apos;s configured keys—check
            your <code className="settings-code">.env</code> for local development.
          </p>
        </article>

        <article className="settings-card settings-card--compact">
          <h2 className="settings-card-title">About</h2>
          <p className="settings-card-desc muted-label">
            TradeSense — CPSC 491 senior capstone (CSUF). Dashboard, watchlist, and sentiment time-lapse
            snapshots are stored under your Firebase account.
          </p>
        </article>
      </div>
    </section>
  )
}
