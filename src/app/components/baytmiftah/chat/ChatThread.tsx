import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n/LocaleContext'
import { inputClass } from '../AirbnbUI'
import { useChatScroll, useChatThread } from '../../../hooks/useChatThread'
import { getListingPath } from '../../../lib/baytmiftah/listing-links'
import { sendAgentMessage } from '../../../lib/baytmiftah/messaging-service'

function MessageBody({ body, own }) {
  const parts = String(body).split(/(https?:\/\/[^\s]+)/g)
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => (
        /^https?:\/\//.test(part) ? (
          <a
            key={`${index}-${part}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={own ? 'underline opacity-90' : 'font-semibold text-brand-accent underline'}
          >
            {part}
          </a>
        ) : (
          <span key={`${index}-text`}>{part}</span>
        )
      ))}
    </div>
  )
}

function formatMessageTime(at) {
  if (!at) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(at))
  } catch {
    return ''
  }
}

function LiveBadge({ live }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${live ? 'text-green-600' : 'text-ink-secondary'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-green-500' : 'bg-ink-muted'}`} />
      {live ? t('messagesPage.live') : t('messagesPage.connecting')}
    </span>
  )
}

export default function ChatThread({
  conversationId,
  className = '',
  inputRounded = 'rounded-2xl',
  stickyInput = false,
  mode = 'consumer',
}) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [draft, setDraft] = useState('')
  const selfLabel = profile?.full_name || user?.user_metadata?.full_name || 'You'
  const { conversation, sending, error, live, send, isOwnMessage } = useChatThread(conversationId, {
    selfLabel: mode === 'agent' ? (profile?.full_name || 'Agent') : selfLabel,
    selfUserId: user?.id,
    sendMessageFn: mode === 'agent' ? sendAgentMessage : undefined,
  })
  const endRef = useChatScroll(conversation?.messages)

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await send(draft)
    if (ok) setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (!conversation) {
    return (
      <div className={`flex flex-1 flex-col items-center justify-center gap-3 p-8 ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
        <p className="text-sm text-ink-secondary">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="flex items-center justify-end border-b border-surface-border px-4 py-2">
        <LiveBadge live={live} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {(conversation.messages ?? []).length === 0 ? (
          <p className="text-center text-sm text-ink-secondary">{t('messagesPage.emptyThread')}</p>
        ) : (
          conversation.messages.map((msg) => {
            const own = isOwnMessage(msg)
            return (
              <div key={msg.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                {!own && msg.sender && (
                  <span className="mb-1 px-1 text-[10px] font-semibold text-ink-secondary">{msg.sender}</span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    own ? 'bg-mobile-forest text-white' : 'bg-surface-subtle text-ink'
                  } ${msg.pending ? 'opacity-70' : ''}`}
                >
                  <MessageBody body={msg.body} own={own} />
                </div>
                {msg.at && (
                  <span className="mt-1 px-1 text-[10px] text-ink-secondary">{formatMessageTime(msg.at)}</span>
                )}
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-600">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className={`flex items-end gap-2 border-t border-surface-border bg-surface p-4 ${
          stickyInput ? 'sticky bottom-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]' : ''
        }`}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('messagesPage.placeholder')}
          rows={1}
          className={`${inputClass} ${inputRounded} max-h-32 min-h-[44px] flex-1 resize-none py-3`}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="mb-0.5 shrink-0 rounded-full bg-mobile-forest px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sending ? t('messagesPage.sending') : t('messagesPage.send')}
        </button>
      </form>
    </div>
  )
}

export function ChatThreadHeader({ conversation, mode = 'consumer' }) {
  const { t } = useTranslation()
  if (!conversation) return null
  const listingId = conversation.listing_id || conversation.listingId
  const title = mode === 'agent'
    ? (conversation.listingTitle || conversation.listing_title || t('messagesPage.buyerThread'))
  : conversation.participant

  return (
    <div className="border-b border-surface-border px-4 py-3">
      <p className="font-semibold text-ink">{title}</p>
      {mode === 'agent' ? (
        <p className="text-sm text-ink-secondary">{t('messagesPage.agentInquiry')}</p>
      ) : conversation.listingTitle && (
        <p className="text-sm text-ink-secondary">{conversation.listingTitle}</p>
      )}
      {listingId && (
        <Link
          to={getListingPath(listingId)}
          className="mt-2 inline-block text-sm font-semibold text-brand-accent underline"
        >
          {t('messagesPage.viewListing')}
        </Link>
      )}
    </div>
  )
}
