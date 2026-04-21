import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  clearAlertEvents,
  loadAlertEvents,
  markAllEventsRead,
  markEventRead,
  subscribeToAlertEvents,
} from '../utils/alertEvaluator'

/**
 * Subscribe to the device-local triggered-event feed for the current user.
 * Updates in real time whenever a new alert is pushed (via a custom event)
 * or localStorage changes in another tab.
 */
export function useAlertEvents() {
  const { user } = useAuth()
  const uid = user?.uid
  const [events, setEvents] = useState(() => (uid ? loadAlertEvents(uid) : []))

  useEffect(() => {
    if (!uid) { setEvents([]); return }
    setEvents(loadAlertEvents(uid))
    const unsub = subscribeToAlertEvents(uid, setEvents)
    return unsub
  }, [uid])

  const unreadCount = events.filter((e) => !e.read).length

  const markAllRead = useCallback(() => {
    if (uid) markAllEventsRead(uid)
  }, [uid])

  const markRead = useCallback((id) => {
    if (uid) markEventRead(uid, id)
  }, [uid])

  const clearAll = useCallback(() => {
    if (uid) clearAlertEvents(uid)
  }, [uid])

  return { events, unreadCount, markAllRead, markRead, clearAll }
}
