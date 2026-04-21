/**
 * Pure alert evaluation logic + a tiny localStorage-backed event store.
 *
 * Why localStorage and not Firestore for triggered events?
 *   MVP scope. Rules persist in Firestore (shared across devices), but the
 *   triggered-event feed is per-device/per-session for simplicity. This
 *   avoids a second collection + rule migration. Easy to upgrade later.
 */

const MAX_EVENTS = 50
const COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const EVENTS_UPDATED_EVENT = 'alerts:events-updated'

// ---------- keys ----------

function eventsKey(uid) { return `tradesense_alert_events_${uid}` }
function stateKey(uid) { return `tradesense_alert_state_${uid}` }

// ---------- local state (edge detection + cooldowns) ----------

function readState(uid) {
  if (!uid) return {}
  try {
    const raw = localStorage.getItem(stateKey(uid))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeState(uid, state) {
  if (!uid) return
  try {
    localStorage.setItem(stateKey(uid), JSON.stringify(state))
  } catch { /* quota exceeded - ignore */ }
}

// ---------- event feed ----------

export function loadAlertEvents(uid) {
  if (!uid) return []
  try {
    const raw = localStorage.getItem(eventsKey(uid))
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveAlertEvents(uid, events) {
  if (!uid) return
  try {
    const trimmed = events.slice(0, MAX_EVENTS)
    localStorage.setItem(eventsKey(uid), JSON.stringify(trimmed))
    window.dispatchEvent(new Event(EVENTS_UPDATED_EVENT))
  } catch { /* ignore */ }
}

export function clearAlertEvents(uid) {
  saveAlertEvents(uid, [])
}

export function markAllEventsRead(uid) {
  const events = loadAlertEvents(uid)
  const updated = events.map((e) => ({ ...e, read: true }))
  saveAlertEvents(uid, updated)
}

export function markEventRead(uid, eventId) {
  const events = loadAlertEvents(uid)
  const updated = events.map((e) => (e.id === eventId ? { ...e, read: true } : e))
  saveAlertEvents(uid, updated)
}

export function subscribeToAlertEvents(uid, callback) {
  if (!uid) return () => {}
  const handler = () => callback(loadAlertEvents(uid))
  const storageHandler = (e) => {
    if (e.key === eventsKey(uid)) handler()
  }
  window.addEventListener(EVENTS_UPDATED_EVENT, handler)
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener(EVENTS_UPDATED_EVENT, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

// ---------- evaluation ----------

/**
 * Evaluate all rules for a given symbol against its current market data.
 * Fires at most one event per rule per call. Uses edge-detection + cooldown
 * to prevent duplicate alerts on repeated renders.
 *
 * @param {object} args
 * @param {string} args.uid                  - current user uid
 * @param {Array}  args.rules                - all alert rule docs for this user
 * @param {string} args.symbol               - symbol being evaluated
 * @param {object} args.data                 - { price, changePercent, rsi, sentimentLabel }
 * @returns {Array} newly created event objects (already persisted)
 */
export function evaluateRulesForSymbol({ uid, rules, symbol, data }) {
  if (!uid || !Array.isArray(rules) || !symbol || !data) return []

  const applicable = rules.filter(
    (r) => r.enabled !== false && r.symbol === symbol,
  )
  if (applicable.length === 0) return []

  const state = readState(uid)
  const now = Date.now()
  const newEvents = []

  for (const rule of applicable) {
    const res = evaluateRule(rule, data, state[rule.id] || {}, now)
    if (res.transitioned && res.nowTriggered) {
      const lastTriggeredAt = state[rule.id]?.lastTriggeredAt || 0
      if (now - lastTriggeredAt >= COOLDOWN_MS) {
        const ev = buildEvent(rule, data, res.message)
        newEvents.push(ev)
        state[rule.id] = {
          ...(state[rule.id] || {}),
          lastState: res.newState,
          lastTriggeredAt: now,
        }
        continue
      }
    }
    state[rule.id] = {
      ...(state[rule.id] || {}),
      lastState: res.newState,
    }
  }

  writeState(uid, state)

  if (newEvents.length > 0) {
    const existing = loadAlertEvents(uid)
    const merged = [...newEvents, ...existing]
    saveAlertEvents(uid, merged)
  }

  return newEvents
}

function evaluateRule(rule, data, prev, now) {
  switch (rule.type) {
    case 'price_above': return evalPriceCross(rule, data, prev, 'above')
    case 'price_below': return evalPriceCross(rule, data, prev, 'below')
    case 'price_change_pct': return evalPriceChangePct(rule, data, prev)
    case 'rsi_overbought': return evalRsiZone(rule, data, prev, 'overbought')
    case 'rsi_oversold': return evalRsiZone(rule, data, prev, 'oversold')
    case 'sentiment_turns': return evalSentiment(rule, data, prev)
    default: return { transitioned: false, nowTriggered: false, newState: prev.lastState, message: '' }
  }
  /* eslint-disable no-unused-vars */
  // now param reserved for future per-rule schedule logic
  // eslint-disable-next-line
  void now
}

function evalPriceCross(rule, data, prev, direction) {
  const price = Number(data.price)
  const threshold = Number(rule.threshold)
  if (!Number.isFinite(price) || !Number.isFinite(threshold)) {
    return { transitioned: false, nowTriggered: false, newState: prev.lastState }
  }
  const triggered = direction === 'above' ? price >= threshold : price <= threshold
  const newState = triggered ? 'triggered' : 'idle'
  const transitioned = prev.lastState !== 'triggered' && triggered
  return {
    transitioned,
    nowTriggered: triggered,
    newState,
    message: direction === 'above'
      ? `${rule.symbol} crossed above $${threshold.toFixed(2)} (now $${price.toFixed(2)}).`
      : `${rule.symbol} dropped below $${threshold.toFixed(2)} (now $${price.toFixed(2)}).`,
  }
}

function evalPriceChangePct(rule, data, prev) {
  const pct = Number(data.changePercent)
  const threshold = Number(rule.threshold)
  if (!Number.isFinite(pct) || !Number.isFinite(threshold)) {
    return { transitioned: false, nowTriggered: false, newState: prev.lastState }
  }
  const triggered = Math.abs(pct) >= threshold
  const newState = triggered ? 'triggered' : 'idle'
  const transitioned = prev.lastState !== 'triggered' && triggered
  const dir = pct >= 0 ? 'up' : 'down'
  return {
    transitioned,
    nowTriggered: triggered,
    newState,
    message: `${rule.symbol} moved ${dir} ${Math.abs(pct).toFixed(2)}% today (threshold ±${threshold}%).`,
  }
}

function evalRsiZone(rule, data, prev, zone) {
  const rsi = Number(data.rsi)
  if (!Number.isFinite(rsi)) {
    return { transitioned: false, nowTriggered: false, newState: prev.lastState }
  }
  const triggered = zone === 'overbought' ? rsi >= 70 : rsi <= 30
  const newState = triggered ? 'in_zone' : 'out_of_zone'
  const transitioned = prev.lastState !== 'in_zone' && triggered
  return {
    transitioned,
    nowTriggered: triggered,
    newState,
    message: zone === 'overbought'
      ? `${rule.symbol} RSI entered overbought zone (${rsi.toFixed(1)} ≥ 70).`
      : `${rule.symbol} RSI entered oversold zone (${rsi.toFixed(1)} ≤ 30).`,
  }
}

function evalSentiment(rule, data, prev) {
  const label = String(data.sentimentLabel || '').toLowerCase()
  const target = String(rule.targetSentiment || '').toLowerCase()
  if (!label || !target) {
    return { transitioned: false, nowTriggered: false, newState: prev.lastState }
  }
  const triggered = label === target
  const newState = label
  const transitioned = prev.lastState !== target && triggered
  return {
    transitioned,
    nowTriggered: triggered,
    newState,
    message: `${rule.symbol} sentiment turned ${target}.`,
  }
}

function buildEvent(rule, data, message) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    alertId: rule.id,
    symbol: rule.symbol,
    type: rule.type,
    message,
    note: rule.note || '',
    triggeredAt: new Date().toISOString(),
    read: false,
    context: {
      price: Number.isFinite(data.price) ? data.price : null,
      changePercent: Number.isFinite(data.changePercent) ? data.changePercent : null,
      rsi: Number.isFinite(data.rsi) ? data.rsi : null,
      sentimentLabel: data.sentimentLabel || null,
    },
  }
}
