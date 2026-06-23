import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import ChatThread, { ChatThreadHeader } from '../components/chat/ChatThread'
import { Badge, PageTitle } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchConversations } from '../services/messaging-service'

function MessagesContent() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations().then(({ conversations: rows }) => {
      setConversations(rows)
      setLoading(false)
    })
  }, [])

  const activeMeta = conversations.find((c) => c.id === id)

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('messagesPage.title')} />

      <div className="panel-card grid min-h-[520px] overflow-hidden lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-surface-border lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="p-4 text-sm text-ink-secondary">{t('common.loading')}</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-ink-secondary">{t('messagesPage.emptyInbox')}</p>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className={`block border-b border-surface-border px-4 py-4 transition hover:bg-surface-hover ${
                  id === conv.id ? 'bg-surface-hover' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{conv.participant}</p>
                  {conv.unread > 0 && <Badge tone="accent">{conv.unread}</Badge>}
                </div>
                {conv.listingTitle && (
                  <p className="mt-0.5 truncate text-xs text-ink-secondary">{conv.listingTitle}</p>
                )}
                <p className="mt-1 truncate text-sm text-ink-secondary">{conv.lastMessage}</p>
              </Link>
            ))
          )}
        </aside>
        <section className="flex min-h-[420px] flex-col">
          {!id ? (
            <div className="flex flex-1 items-center justify-center p-8 text-ink-secondary">
              {t('messagesPage.selectConversation')}
            </div>
          ) : (
            <>
              <ChatThreadHeader conversation={activeMeta} />
              <ChatThread conversationId={id} className="min-h-[360px]" />
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
