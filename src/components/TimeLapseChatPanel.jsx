import { useState, useRef, useEffect } from 'react'
import { sendTimeLapseChatMessage } from '../services/timeLapseChatService'
import { buildTimeLapseChatContext } from '../utils/timeLapseChatContext'

export function TimeLapseChatPanel({ symbol, startDate, endDate, snapshots, insights }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Reset chat when the underlying data changes
  const contextKey = `${symbol}|${startDate}|${endDate}|${snapshots.length}`
  const prevKeyRef = useRef(contextKey)
  useEffect(() => {
    if (prevKeyRef.current !== contextKey) {
      setMessages([])
      setInput('')
      setError(null)
      prevKeyRef.current = contextKey
    }
  }, [contextKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const context = buildTimeLapseChatContext({ symbol, startDate, endDate, snapshots, insights })
      const reply = await sendTimeLapseChatMessage({ messages: next, context })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="tl-chat">
      <p className="tl-chat-title">
        <span className="tl-chat-icon" aria-hidden="true">&#x1F4AC;</span>
        Ask about this Time-Lapse
      </p>

      <div className="tl-chat-messages" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <p className="tl-chat-placeholder">
            Ask a question about {symbol}'s snapshots, price movement, or sentiment trends.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`tl-chat-bubble tl-chat-bubble--${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="tl-chat-bubble tl-chat-bubble--assistant tl-chat-bubble--loading">
            <span className="tl-chat-dots"><span /><span /><span /></span>
          </div>
        )}
      </div>

      {error && <p className="tl-chat-error">{error}</p>}

      <form className="tl-chat-input-row" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="tl-chat-input"
          placeholder="Type a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          maxLength={2000}
        />
        <button type="submit" className="tl-chat-send" disabled={!input.trim() || loading}>
          Send
        </button>
      </form>

      <p className="tl-chat-disclaimer">AI answers are based on your saved snapshots only. Not financial advice.</p>
    </div>
  )
}
