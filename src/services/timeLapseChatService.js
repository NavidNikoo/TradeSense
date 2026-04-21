import { auth } from '../firebase/config'

const CHAT_URL = '/api/timelapse-chat'

/**
 * POST to the Time-Lapse chat HTTP function (same-origin in prod; Vite proxies in dev).
 */
export async function sendTimeLapseChatMessage({ messages, context }) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Please sign in to use the chat.')
  }

  const idToken = await user.getIdToken()

  let res
  try {
    res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ messages, context }),
    })
  } catch {
    throw new Error(
      'Network error. If you are on localhost, ensure VITE_FIREBASE_PROJECT_ID is set and the timeLapseChatHttp function is deployed.',
    )
  }

  let data = {}
  try {
    data = await res.json()
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : res.status === 404
          ? 'Chat service not found. Deploy functions: firebase deploy --only functions'
          : res.status === 503
            ? data.error || 'Chat service is not configured on the server.'
            : `Chat request failed (${res.status}).`
    throw new Error(msg)
  }

  if (typeof data.reply !== 'string') {
    throw new Error('Invalid response from chat service.')
  }

  return data.reply
}
