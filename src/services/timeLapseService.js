import {
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION = 'time_lapse'
const WATCHLIST_COLLECTION = 'watchlists'

// --- Per-stock time-lapse enable/disable (stored on the watchlist doc) ---

export async function getTimeLapseSymbols(userId) {
  const ref = doc(db, WATCHLIST_COLLECTION, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  return snap.data().timeLapseSymbols ?? []
}

export async function setTimeLapseSymbol(userId, symbol, enabled) {
  const upper = symbol.toUpperCase()
  const ref = doc(db, WATCHLIST_COLLECTION, userId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    if (enabled) await setDoc(ref, { symbols: [], timeLapseSymbols: [upper] })
    return
  }

  await updateDoc(ref, {
    timeLapseSymbols: enabled ? arrayUnion(upper) : arrayRemove(upper),
  })
}

// --- localStorage helpers for auto-snapshot interval ---

function lastSnapshotKey(userId, symbol) {
  return `tradesense_tl_last:${userId}:${symbol.toUpperCase()}`
}

export function getLastSnapshotTime(userId, symbol) {
  const val = localStorage.getItem(lastSnapshotKey(userId, symbol))
  return val ? parseInt(val, 10) : null
}

export function setLastSnapshotTime(userId, symbol) {
  localStorage.setItem(lastSnapshotKey(userId, symbol), String(Date.now()))
}

export async function saveSnapshot(userId, symbol, data) {
  await addDoc(collection(db, COLLECTION), {
    userId,
    symbol: symbol.toUpperCase(),
    timestamp: Timestamp.now(),
    sentimentSummary: data.sentimentSummary,
    priceSnapshot: data.priceSnapshot,
    articleRefs: data.articleRefs || [],
  })
}

function normalizeError(err) {
  const msg = err?.message || String(err)
  if (msg.includes('requires an index') || msg.includes('indexes?create_composite')) {
    return {
      userMessage:
        'This query needs a Firestore composite index that has not been created yet. ' +
        'Run "firebase deploy --only firestore:indexes" or ask the project owner to deploy indexes.',
      needsIndex: true,
    }
  }
  if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
    return {
      userMessage: 'Permission denied — make sure you are signed in and Firestore rules allow reads for your account.',
      needsIndex: false,
    }
  }
  return { userMessage: msg, needsIndex: false }
}

export async function getSnapshots(userId, symbol, startDate, endDate) {
  const start = Timestamp.fromDate(new Date(startDate))
  const end = Timestamp.fromDate(
    new Date(new Date(endDate).getTime() + 86400000),
  )

  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('symbol', '==', symbol.toUpperCase()),
    where('timestamp', '>=', start),
    where('timestamp', '<=', end),
    orderBy('timestamp', 'asc'),
  )

  let snap
  try {
    snap = await getDocs(q)
  } catch (err) {
    const { userMessage } = normalizeError(err)
    throw new Error(userMessage)
  }

  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()
        ? data.timestamp.toDate().toISOString()
        : data.timestamp,
    }
  })
}

export async function deleteSnapshot(snapshotId) {
  await deleteDoc(doc(db, COLLECTION, snapshotId))
}
