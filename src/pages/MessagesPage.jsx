import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { Badge, PageTitle, inputClass } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchConversation, fetchConversations, sendMessage } from '../services/messaging-service'
import { subscribeToMessages } from '../lib/realtime'

function MessagesContent() {
  const { t } = useTranslation()
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
          messages: [...(prev.messages ?? []), { id: row.id, sender: row.sender, body: row.body }],
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
      <PageTitle title={t('messagesPage.title')} subtitle={t('messagesPage.subtitle')} />

      <div className="panel-card grid min-h-[520px] overflow-hidden lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-surface-border lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="p-4 text-sm text-ink-secondary">{t('common.loading')}</p>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className={`block border-b border-surface-border px-4 py-4 transition hover:bg-surface-hover ${
                  id === conv.id ? 'bg-surface-hover' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">{conv.participant}</p>
                  {conv.unread > 0 && (
                    <Badge tone="accent">{conv.unread}</Badge>
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
              {t('messagesPage.selectConversation')}
            </div>
          ) : (
            <>
              <div className="border-b border-surface-border px-4 py-3">
                <p className="font-semibold text-ink">{active.participant}</p>
                <p className="text-sm text-ink-secondary">{active.listingTitle}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.sender === 'You' ? 'ml-auto bg-ink text-white' : 'bg-surface-subtle text-ink'
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
                  placeholder={t('messagesPage.placeholder')}
                  className={`${inputClass} rounded-full`}
                />
                <button type="submit" className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-white">
                  {t('messagesPage.send')}
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
