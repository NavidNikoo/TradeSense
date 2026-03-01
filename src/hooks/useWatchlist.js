import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import * as svc from '../services/watchlistService'

export function useWatchlist() {
  const { user } = useAuth()
  const userId = user?.uid

  const [symbols, setSymbols] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const activeUid = useRef(null)

  if (activeUid.current !== userId) {
    activeUid.current = userId
    if (!userId) {
      setSymbols([])
      setReady(true)
    } else {
      setReady(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true
        setError('Could not load watchlist. Check your connection and Firebase setup.')
        setReady(true)
      }
    }, 8000)

    svc.getWatchlist(userId)
      .then((data) => {
        if (!cancelled) {
          setSymbols(data.symbols)
          setError(null)
          setReady(true)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Could not load watchlist.')
          setReady(true)
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [userId])

  const loading = !ready

  const addSymbol = useCallback(async (symbol) => {
    if (!userId) return
    const upper = symbol.toUpperCase().trim()
    if (!upper || symbols.includes(upper)) return

    setSymbols((prev) => [...prev, upper])

    try {
      await svc.addSymbol(userId, upper)
    } catch (err) {
      setError(err.message)
      setSymbols((prev) => prev.filter((s) => s !== upper))
    }
  }, [userId, symbols])

  const removeSymbol = useCallback(async (symbol) => {
    if (!userId) return
    const upper = symbol.toUpperCase().trim()

    setSymbols((prev) => prev.filter((s) => s !== upper))

    try {
      await svc.removeSymbol(userId, upper)
    } catch (err) {
      setError(err.message)
      setSymbols((prev) => [...prev, upper])
    }
  }, [userId])

  const moveSymbol = useCallback(async (index, direction) => {
    if (!userId) return
    const target = index + direction
    if (target < 0 || target >= symbols.length) return

    const reordered = [...symbols]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)

    setSymbols(reordered)

    try {
      await svc.reorderSymbols(userId, reordered)
    } catch (err) {
      setError(err.message)
    }
  }, [userId, symbols])

  return { symbols, loading, error, addSymbol, removeSymbol, moveSymbol }
}
