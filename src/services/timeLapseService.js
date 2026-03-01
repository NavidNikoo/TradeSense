import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION = 'time_lapse'

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

  const snap = await getDocs(q)

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
