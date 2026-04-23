import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTimeLapseSymbols, setTimeLapseSymbol } from '../services/timeLapseService'

/**
 * useTimeLapse — manages the per-stock time-lapse enabled list for the
 * current user. Reads the list from Firestore on mount; toggle() updates
 * both local state and Firestore.
 *
 * Returns:
 *   enabledSymbols  Set<string>   — uppercased symbols with time-lapse on
 *   isEnabled       fn(sym)       — true if that symbol is currently enabled
 *   toggle          fn(sym)       — enables or disables a symbol
 *   loading         boolean       — true while the initial Firestore read is in flight
 */
export function useTimeLapse() {
  const { user } = useAuth()
  const userId = user?.uid

  const [enabledSymbols, setEnabledSymbols] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setEnabledSymbols(new Set())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    getTimeLapseSymbols(userId)
      .then((syms) => {
        if (!cancelled) {
          setEnabledSymbols(new Set(syms.map((s) => s.toUpperCase())))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  const toggle = useCallback(async (symbol) => {
    if (!userId) return
    const upper = symbol.toUpperCase()
    const nowEnabled = !enabledSymbols.has(upper)

    // Optimistic update
    setEnabledSymbols((prev) => {
      const next = new Set(prev)
      if (nowEnabled) next.add(upper)
      else next.delete(upper)
      return next
    })

    try {
      await setTimeLapseSymbol(userId, upper, nowEnabled)
    } catch {
      // Roll back on failure
      setEnabledSymbols((prev) => {
        const next = new Set(prev)
        if (nowEnabled) next.delete(upper)
        else next.add(upper)
        return next
      })
    }
  }, [userId, enabledSymbols])

  const isEnabled = useCallback(
    (symbol) => enabledSymbols.has(symbol?.toUpperCase()),
    [enabledSymbols],
  )

  return { enabledSymbols, isEnabled, toggle, loading }
}
