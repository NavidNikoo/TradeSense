import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  createAlertRule,
  deleteAlertRule,
  listAlertRules,
  updateAlertRule,
} from '../services/alertsService'

/**
 * Load + mutate alert rules for the current user.
 * Kept deliberately simple (manual reload after mutation rather than
 * a live snapshot listener) so this works without extra rule-rights.
 */
export function useAlertRules() {
  const { user } = useAuth()
  const uid = user?.uid

  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!uid) {
      setRules([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const list = await listAlertRules(uid)
      setRules(list)
      setError(null)
    } catch (e) {
      setError(e.message || 'Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { reload() }, [reload])

  const add = useCallback(async (rule) => {
    if (!uid) throw new Error('Not signed in')
    await createAlertRule(uid, rule)
    await reload()
  }, [uid, reload])

  const update = useCallback(async (id, patch) => {
    await updateAlertRule(id, patch)
    await reload()
  }, [reload])

  const remove = useCallback(async (id) => {
    await deleteAlertRule(id)
    await reload()
  }, [reload])

  const toggle = useCallback(async (id, enabled) => {
    await updateAlertRule(id, { enabled })
    await reload()
  }, [reload])

  return { rules, loading, error, reload, add, update, remove, toggle }
}
