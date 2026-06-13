import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { fetchConversation, fetchConversations, sendMessage } from '../services/messaging-service'
import { subscribeToMessages } from '../lib/realtime'

function MessagesContent() {
  const { id } = useParams()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations().then(({ conversations: rows }) => {
      setConversations(rows)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!id) {
      setActive(null)
      return undefined
    }
    fetchConversation(id).then(({ conversation }) => setActive(conversation))

    return subscribeToMessages(id, (row) => {
      setActive((prev) => {
        if (!prev || prev.id !== id) return prev
        return {
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            { id: row.id, sender: row.sender, body: row.body },
          ],
        }
      })
    })
  }, [id])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !active) return
    await sendMessage(active.id, draft.trim())
    setDraft('')
    const { conversation } = await fetchConversation(active.id)
    setActive(conversation)
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Messages</h1>
      <div className="mt-6 grid min-h-[520px] overflow-hidden rounded-card border border-surface-border lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-surface-border lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="p-4 text-sm text-ink-secondary">Loading…</p>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className={`block border-b border-surface-border px-4 py-4 hover:bg-surface-subtle ${
                  id === conv.id ? 'bg-brand-light' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">{conv.participant}</p>
                  {conv.unread > 0 && (
                    <span className="rounded-full bg-brand-dark px-2 py-0.5 text-xs text-brand">{conv.unread}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-ink-secondary">{conv.lastMessage}</p>
              </Link>
            ))
          )}
        </aside>
        <section className="flex flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-8 text-ink-secondary">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="border-b border-surface-border px-4 py-3">
                <p className="font-semibold">{active.participant}</p>
                <p className="text-sm text-ink-secondary">{active.listingTitle}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.sender === 'You' ? 'ml-auto bg-brand-dark text-brand' : 'bg-surface-subtle text-ink'
                    }`}
                  >
                    {msg.body}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t border-surface-border p-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="flex-1 rounded-full border border-surface-border px-4 py-2 text-sm outline-none"
                />
                <button type="submit" className="rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-brand">
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </DesktopShell>
  )
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  )
}
