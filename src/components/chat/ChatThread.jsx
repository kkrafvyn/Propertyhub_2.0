import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { inputClass } from '../ui/AirbnbUI'
import { useChatScroll, useChatThread } from '../../hooks/useChatThread'
import { getListingPath } from '../../lib/listing-links'

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

export default function ChatThread({
  conversationId,
  className = '',
  inputRounded = 'rounded-full',
  stickyInput = false,
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const { conversation, sending, error, send, isOwnMessage } = useChatThread(conversationId)
  const endRef = useChatScroll(conversation?.messages)

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await send(draft)
    if (ok) setDraft('')
  }

  if (!conversation) {
    return (
      <div className={`flex flex-1 items-center justify-center p-8 text-sm text-ink-secondary ${className}`}>
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {(conversation.messages ?? []).length === 0 ? (
          <p className="text-center text-sm text-ink-secondary">{t('messagesPage.emptyThread')}</p>
        ) : (
          conversation.messages.map((msg) => {
            const own = isOwnMessage(msg)
            return (
              <div key={msg.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    own ? 'bg-ink text-white' : 'bg-surface-subtle text-ink'
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
        className={`flex gap-2 border-t border-surface-border bg-surface p-4 ${
          stickyInput ? 'sticky bottom-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]' : ''
        }`}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('messagesPage.placeholder')}
          className={`${inputClass} ${inputRounded} flex-1`}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="shrink-0 rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sending ? t('messagesPage.sending') : t('messagesPage.send')}
        </button>
      </form>
    </div>
  )
}

export function ChatThreadHeader({ conversation }) {
  const { t } = useTranslation()
  if (!conversation) return null
  const listingId = conversation.listing_id || conversation.listingId
  return (
    <div className="border-b border-surface-border px-4 py-3">
      <p className="font-semibold text-ink">{conversation.participant}</p>
      {conversation.listingTitle && (
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
