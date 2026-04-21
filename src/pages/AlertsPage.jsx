import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlertRules } from '../hooks/useAlertRules'
import { useAlertEvents } from '../hooks/useAlertEvents'
import { useWatchlist } from '../hooks/useWatchlist'
import { ALERT_TYPES, describeAlertType } from '../services/alertsService'
import { Modal } from '../components/Modal'
import { AlertsHelpContent } from '../components/AlertsHelpContent'

const DEFAULT_FORM = {
  symbol: '',
  type: 'price_change_pct',
  threshold: '',
  targetSentiment: 'positive',
  note: '',
  enabled: true,
}

export function AlertsPage() {
  const { rules, loading, error, add, remove, toggle } = useAlertRules()
  const { events, unreadCount, markAllRead, markRead, clearAll } = useAlertEvents()
  const { symbols } = useWatchlist()

  const [form, setForm] = useState(DEFAULT_FORM)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const watchlistSet = useMemo(() => new Set(symbols), [symbols])

  const needsThreshold = form.type === 'price_above'
    || form.type === 'price_below'
    || form.type === 'price_change_pct'
  const needsSentiment = form.type === 'sentiment_turns'

  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const payload = {
        symbol: form.symbol,
        type: form.type,
        enabled: true,
        note: form.note,
      }
      if (needsThreshold) payload.threshold = form.threshold
      if (needsSentiment) payload.targetSentiment = form.targetSentiment
      await add(payload)
      setForm(DEFAULT_FORM)
    } catch (err) {
      setFormError(err.message || 'Could not create alert.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="alerts-wrapper">
      <div className="alerts-header">
        <div>
          <h2>
            Market Alerts
            <button
              type="button"
              className="alerts-help-btn"
              onClick={() => setHelpOpen(true)}
              aria-label="How alerts work"
              title="How alerts work"
            >
              ?
            </button>
          </h2>
          <p className="alerts-subtitle">
            Get notified when your tickers cross price levels, reach RSI
            extremes, or flip sentiment.
            {' '}
            <Link to="/dashboard">Visit the Dashboard</Link> to evaluate your rules
            against live data.
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="alerts-mark-read-btn" onClick={markAllRead}>
            Mark {unreadCount} read
          </button>
        )}
      </div>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="How Market Alerts work"
      >
        <AlertsHelpContent />
      </Modal>

      <div className="alerts-layout">
        <div className="alerts-column">
          <h3>Create a new alert</h3>
          <form className="alerts-form" onSubmit={handleSubmit}>
            <label className="alerts-field">
              <span>Symbol</span>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => updateForm({ symbol: e.target.value.toUpperCase() })}
                placeholder="AAPL"
                list="alerts-symbol-suggestions"
                maxLength={10}
                required
              />
              <datalist id="alerts-symbol-suggestions">
                {symbols.map((s) => <option key={s} value={s} />)}
              </datalist>
            </label>

            <label className="alerts-field">
              <span>Trigger</span>
              <select
                value={form.type}
                onChange={(e) => updateForm({ type: e.target.value })}
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t} value={t}>{describeAlertType(t)}</option>
                ))}
              </select>
            </label>

            {needsThreshold && (
              <label className="alerts-field">
                <span>
                  {form.type === 'price_change_pct' ? 'Threshold (%)' : 'Threshold ($)'}
                </span>
                <input
                  type="number"
                  min="0"
                  step={form.type === 'price_change_pct' ? '0.1' : '0.01'}
                  value={form.threshold}
                  onChange={(e) => updateForm({ threshold: e.target.value })}
                  placeholder={form.type === 'price_change_pct' ? '3' : '150.00'}
                  required
                />
              </label>
            )}

            {needsSentiment && (
              <label className="alerts-field">
                <span>Target sentiment</span>
                <select
                  value={form.targetSentiment}
                  onChange={(e) => updateForm({ targetSentiment: e.target.value })}
                >
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </label>
            )}

            <label className="alerts-field">
              <span>Note (optional)</span>
              <input
                type="text"
                value={form.note}
                onChange={(e) => updateForm({ note: e.target.value })}
                placeholder="Earnings week"
                maxLength={120}
              />
            </label>

            {formError && <p className="alerts-error">{formError}</p>}

            <button type="submit" className="alerts-submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create alert'}
            </button>
          </form>

          <h3 className="alerts-list-header">Your rules</h3>
          {loading ? (
            <p className="muted-label">Loading…</p>
          ) : error ? (
            <p className="alerts-error">{error}</p>
          ) : rules.length === 0 ? (
            <p className="muted-label">No alerts yet. Add one above.</p>
          ) : (
            <ul className="alerts-rule-list">
              {rules.map((rule) => (
                <li key={rule.id} className={`alerts-rule ${rule.enabled ? '' : 'alerts-rule--disabled'}`}>
                  <div className="alerts-rule-main">
                    <div className="alerts-rule-top">
                      <span className="alerts-rule-symbol">{rule.symbol}</span>
                      {!watchlistSet.has(rule.symbol) && (
                        <span
                          className="alerts-rule-warning"
                          title="This ticker is not on your watchlist, so it won't be evaluated automatically from the Dashboard."
                        >
                          not on watchlist
                        </span>
                      )}
                    </div>
                    <div className="alerts-rule-desc">{formatRule(rule)}</div>
                    {rule.note && <div className="alerts-rule-note">“{rule.note}”</div>}
                  </div>
                  <div className="alerts-rule-actions">
                    <button
                      type="button"
                      className="alerts-rule-toggle"
                      onClick={() => toggle(rule.id, !rule.enabled)}
                      aria-pressed={rule.enabled}
                      title={rule.enabled ? 'Disable' : 'Enable'}
                    >
                      {rule.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      className="alerts-rule-delete"
                      onClick={() => remove(rule.id)}
                      title="Delete rule"
                      aria-label={`Delete ${rule.symbol} alert`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="alerts-column">
          <div className="alerts-feed-header">
            <h3>Triggered events</h3>
            {events.length > 0 && (
              <button type="button" className="alerts-clear-btn" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          {events.length === 0 ? (
            <p className="muted-label">
              No events yet. Visit the{' '}
              <Link to="/dashboard">Dashboard</Link>{' '}
              so your rules can evaluate against current market data.
            </p>
          ) : (
            <ul className="alerts-event-list">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className={`alerts-event ${ev.read ? 'alerts-event--read' : ''}`}
                  onClick={() => !ev.read && markRead(ev.id)}
                >
                  <div className="alerts-event-top">
                    <span className="alerts-event-symbol">{ev.symbol}</span>
                    <span className="alerts-event-time">{formatTime(ev.triggeredAt)}</span>
                    {!ev.read && <span className="alerts-event-dot" aria-label="unread" />}
                  </div>
                  <div className="alerts-event-message">{ev.message}</div>
                  {ev.note && <div className="alerts-event-note">“{ev.note}”</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function formatRule(rule) {
  switch (rule.type) {
    case 'price_above':
      return `Alert when price goes above $${Number(rule.threshold).toFixed(2)}`
    case 'price_below':
      return `Alert when price drops below $${Number(rule.threshold).toFixed(2)}`
    case 'price_change_pct':
      return `Alert on ±${Number(rule.threshold)}% daily move`
    case 'rsi_overbought':
      return 'Alert when RSI ≥ 70 (overbought)'
    case 'rsi_oversold':
      return 'Alert when RSI ≤ 30 (oversold)'
    case 'sentiment_turns':
      return `Alert when sentiment turns ${rule.targetSentiment}`
    default:
      return describeAlertType(rule.type)
  }
}

function formatTime(iso) {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}
