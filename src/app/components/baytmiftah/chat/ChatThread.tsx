import { readTextSessionDraft, writeSessionDraft, clearSessionDraft } from "../../../../lib/session-draft";
import { Textarea } from "@/app/components/ui/textarea";
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Phone, Video as VideoIcon } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n/LocaleContext'
import { useCall } from '../../../context/CallContext'
import { isVideoCallsEnabledForApp } from '../../../../lib/app-feature-gates'
import { usePlatformFeatures } from '../../../context/PlatformFeaturesContext'
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
  const draftKey = `message:${user?.id || 'guest'}:${conversationId}`
  const [draft, setDraft] = useState(() => readTextSessionDraft(draftKey))
  useEffect(() => { setDraft(readTextSessionDraft(draftKey)) }, [draftKey])
  const updateDraft = (value: string) => { setDraft(value); if (value) writeSessionDraft(draftKey, value); else clearSessionDraft(draftKey) }
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
    if (ok) updateDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
        <p role="alert" className="px-4 pb-2 text-sm text-red-600">{error}</p>
      )}

      {mode === 'consumer' && <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-surface-border px-4 py-2" aria-label="Suggested replies">
        {['Is this property still available?', 'Could we arrange a viewing?', 'Please confirm the total upfront cost.'].map((reply) => <button key={reply} type="button" disabled={sending} onClick={() => updateDraft(reply)} className="min-h-11 shrink-0 rounded-full border border-surface-border px-3 text-xs text-ink">{reply}</button>)}
      </div>}
      <form
        onSubmit={handleSubmit}
        className={`flex items-end gap-2 border-t border-surface-border bg-surface p-4 ${
          stickyInput ? 'sticky bottom-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]' : ''
        }`}
      >
        <Textarea
          value={draft}
          onChange={(e) => updateDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Message"
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

export function ChatThreadHeader({ conversation, mode = 'consumer' }: { conversation: any; mode?: 'consumer' | 'agent' }) {
  const { t } = useTranslation()
  const { startCall } = useCall()
  if (!conversation) return null
  const listingId = conversation.listing_id || conversation.listingId
  const title = mode === 'agent'
    ? (conversation.listingTitle || conversation.listing_title || t('messagesPage.buyerThread'))
    : conversation.participant || 'BaytMiftah Member'

  const handleStartVoiceCall = () => {
    void startCall(
      {
        name: title,
        role: mode === 'agent' ? 'Buyer / Lead' : 'Listing Host / Agent',
        phone: conversation.phone,
      },
      'voice',
      {
        listingId,
        listingTitle: conversation.listingTitle || conversation.listing_title,
      }
    )
  }

  const { flags } = usePlatformFeatures()
  const videoEnabled = isVideoCallsEnabledForApp(flags)

  const handleStartVideoCall = () => {
    if (!videoEnabled) return
    void startCall(
      {
        name: title,
        role: mode === 'agent' ? 'Buyer / Lead' : 'Listing Host / Agent',
        phone: conversation.phone,
      },
      'video',
      {
        listingId,
        listingTitle: conversation.listingTitle || conversation.listing_title,
      }
    )
  }

  return (
    <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink truncate">{title}</p>
        {mode === 'agent' ? (
          <p className="text-xs text-ink-secondary">{t('messagesPage.agentInquiry')}</p>
        ) : conversation.listingTitle ? (
          <p className="text-xs text-ink-secondary truncate">{conversation.listingTitle}</p>
        ) : null}
        {listingId && (
          <Link
            to={getListingPath(listingId)}
            className="mt-1 inline-block text-xs font-semibold text-brand-accent underline"
          >
            {t('messagesPage.viewListing')}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        <button
          type="button"
          onClick={handleStartVoiceCall}
          title="Start Voice Call"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-ink transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50"
        >
          <Phone className="h-4 w-4" />
        </button>

        {videoEnabled ? (
          <button
            type="button"
            onClick={handleStartVideoCall}
            title="Start HD Video Tour / Call"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-ink transition hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/50"
          >
            <VideoIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
