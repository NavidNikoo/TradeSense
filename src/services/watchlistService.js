import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase/config'

const COLLECTION = 'watchlists'

function watchlistRef(userId) {
  return doc(db, COLLECTION, userId)
}

export async function getWatchlist(userId) {
  const snap = await getDoc(watchlistRef(userId))

  if (!snap.exists()) {
    return { userId, symbols: [] }
  }

  return { userId, symbols: snap.data().symbols ?? [] }
}

export async function addSymbol(userId, symbol) {
  const upper = symbol.toUpperCase().trim()

  if (!upper) return

  const ref = watchlistRef(userId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, { symbols: [upper] })
  } else {
    await updateDoc(ref, { symbols: arrayUnion(upper) })
  }
}

export async function removeSymbol(userId, symbol) {
  await updateDoc(watchlistRef(userId), {
    symbols: arrayRemove(symbol.toUpperCase().trim()),
  })
}

export async function reorderSymbols(userId, symbols) {
  await updateDoc(watchlistRef(userId), { symbols })
}
