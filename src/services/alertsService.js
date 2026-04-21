import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION = 'alerts'

/**
 * Alert rule document shape:
 * {
 *   userId:     string              - owner (must match request.auth.uid)
 *   symbol:     string              - uppercase ticker
 *   type:       string              - one of ALERT_TYPES
 *   threshold:  number | null       - numeric threshold (price / pct) if applicable
 *   targetSentiment: string | null  - 'positive' | 'neutral' | 'negative' (for sentiment_turns)
 *   enabled:    boolean
 *   note:       string              - optional label
 *   createdAt:  Timestamp
 * }
 */

export const ALERT_TYPES = [
  'price_above',
  'price_below',
  'price_change_pct',
  'rsi_overbought',
  'rsi_oversold',
  'sentiment_turns',
]

export function describeAlertType(type) {
  switch (type) {
    case 'price_above': return 'Price crosses above $X'
    case 'price_below': return 'Price crosses below $X'
    case 'price_change_pct': return 'Daily % change beyond ±X%'
    case 'rsi_overbought': return 'RSI enters overbought (≥ 70)'
    case 'rsi_oversold': return 'RSI enters oversold (≤ 30)'
    case 'sentiment_turns': return 'Sentiment turns to target label'
    default: return type
  }
}

export async function listAlertRules(userId) {
  // NOTE: We intentionally avoid `orderBy('createdAt', 'desc')` in the
  // Firestore query so we don't require a composite index on
  // (userId ASC, createdAt DESC). With only a handful of alert rules per
  // user, sorting client-side is simpler to operate.
  const q = query(collection(db, COLLECTION), where('userId', '==', userId))
  const snap = await getDocs(q)
  const rules = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  rules.sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a))
  return rules
}

function getCreatedAtMs(rule) {
  const v = rule?.createdAt
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v.seconds === 'number') return v.seconds * 1000
  if (v instanceof Date) return v.getTime()
  const parsed = Date.parse(v)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function createAlertRule(userId, rule) {
  const payload = normalizeRulePayload(userId, rule)
  const ref = await addDoc(collection(db, COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...payload }
}

export async function updateAlertRule(alertId, patch) {
  const cleaned = { ...patch }
  delete cleaned.id
  delete cleaned.userId
  delete cleaned.createdAt
  await updateDoc(doc(db, COLLECTION, alertId), cleaned)
}

export async function deleteAlertRule(alertId) {
  await deleteDoc(doc(db, COLLECTION, alertId))
}

function normalizeRulePayload(userId, rule) {
  if (!rule.symbol || typeof rule.symbol !== 'string') {
    throw new Error('Symbol is required.')
  }
  if (!ALERT_TYPES.includes(rule.type)) {
    throw new Error(`Unknown alert type: ${rule.type}`)
  }

  const base = {
    userId,
    symbol: rule.symbol.toUpperCase().trim().slice(0, 10),
    type: rule.type,
    enabled: rule.enabled !== false,
    note: String(rule.note || '').slice(0, 120),
  }

  if (rule.type === 'price_above' || rule.type === 'price_below') {
    const n = Number(rule.threshold)
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('Enter a positive price threshold.')
    }
    base.threshold = n
  } else if (rule.type === 'price_change_pct') {
    const n = Number(rule.threshold)
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      throw new Error('Enter a % change between 0 and 100.')
    }
    base.threshold = n
  } else {
    base.threshold = null
  }

  if (rule.type === 'sentiment_turns') {
    const s = String(rule.targetSentiment || '').toLowerCase()
    if (!['positive', 'neutral', 'negative'].includes(s)) {
      throw new Error('Pick a target sentiment label.')
    }
    base.targetSentiment = s
  } else {
    base.targetSentiment = null
  }

  return base
}
