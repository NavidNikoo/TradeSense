import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../firebase/config'

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus, setPwStatus]               = useState(null)
  const [pwLoading, setPwLoading]             = useState(false)
  const [showPasswords, setShowPasswords]     = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwStatus(null)

    if (newPassword.length < 8) {
      setPwStatus({ type: 'error', message: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (currentPassword === newPassword) {
      setPwStatus({ type: 'error', message: 'New password must differ from current password.' })
      return
    }

    setPwLoading(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setPwStatus({ type: 'success', message: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const messages = {
        'auth/wrong-password':       'Current password is incorrect.',
        'auth/too-many-requests':    'Too many attempts. Please wait a moment and try again.',
        'auth/requires-recent-login':'Session expired. Please sign out and sign back in.',
        'auth/weak-password':        'Password is too weak. Use at least 8 characters.',
      }
      setPwStatus({ type: 'error', message: messages[err.code] ?? 'Something went wrong. Please try again.' })
    } finally {
      setPwLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '14px',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 'var(--border-radius-md)',
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
    fontWeight: '500',
  }

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
            <div>
              <dt>Account created</dt>
              <dd>
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>
                {user?.metadata?.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="settings-card">
          <h2 className="settings-card-title">Change password</h2>
          <p className="settings-card-desc muted-label">
            Choose a strong password with at least 8 characters.
          </p>

          <form onSubmit={handleChangePassword} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div>
                <label style={labelStyle} htmlFor="current-pw">Current password</label>
                <input
                  id="current-pw"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={inputStyle}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="new-pw">New password</label>
                <input
                  id="new-pw"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={inputStyle}
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="confirm-pw">Confirm new password</label>
                <input
                  id="confirm-pw"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={inputStyle}
                  placeholder="Repeat new password"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={e => setShowPasswords(e.target.checked)}
                  style={{ accentColor: 'var(--color-text-info)', width: '14px', height: '14px' }}
                />
                Show passwords
              </label>

              {newPassword.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {['weak', 'fair', 'strong'].map((level, i) => {
                    const strength = newPassword.length < 8 ? 0 : newPassword.length < 12 ? 1 : 2
                    const colors = ['var(--color-background-danger)', 'var(--color-background-warning)', 'var(--color-background-success)']
                    const active = i <= strength
                    return (
                      <div key={level} style={{ flex: 1, height: '4px', borderRadius: '2px', background: active ? colors[strength] : 'var(--color-border-tertiary)', transition: 'background 0.2s' }} />
                    )
                  })}
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', minWidth: '36px' }}>
                    {newPassword.length < 8 ? 'weak' : newPassword.length < 12 ? 'fair' : 'strong'}
                  </span>
                </div>
              )}

              {pwStatus && (
                <p style={{
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: 'var(--border-radius-md)',
                  background: pwStatus.type === 'success' ? 'var(--color-background-success)' : 'var(--color-background-danger)',
                  color: pwStatus.type === 'success' ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                  margin: 0,
                }}>
                  {pwStatus.message}
                </p>
              )}

              <button
                type="submit"
                disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                className="settings-segment-btn is-active"
                style={{ alignSelf: 'flex-start', opacity: pwLoading ? 0.6 : 1 }}
              >
                {pwLoading ? 'Updating…' : 'Update password'}
              </button>

            </div>
          </form>
        </article>

        <article className="settings-card">
          <h2 className="settings-card-title">Data &amp; APIs</h2>
          <p className="settings-card-desc muted-label">
            Quotes and news come from Finnhub; chart history is loaded via the app&apos;s chart proxy.
            Sentiment uses a Hugging Face model. Nothing here leaves your team&apos;s configured keys — check
            your <code className="settings-code">.env</code> for local development.
          </p>
          <dl className="settings-dl" style={{ marginTop: '12px' }}>
            <div>
              <dt>Market data</dt>
              <dd style={{ color: 'var(--color-text-success)', fontSize: '13px' }}>Finnhub — connected</dd>
            </div>
            <div>
              <dt>Sentiment</dt>
              <dd style={{ fontSize: '13px' }}>Hugging Face (FinBERT)</dd>
            </div>
            <div>
              <dt>Chart proxy</dt>
              <dd style={{ fontSize: '13px' }}>Yahoo Finance via Vite proxy (dev)</dd>
            </div>
          </dl>
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
