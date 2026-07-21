import { Link } from 'react-router'
import { useTranslation } from '../../../i18n/LocaleContext'
import { CONSUMER_ROUTES, messageThreadPath } from '../../../lib/consumer-routes'

function formatRelativeTime(updatedAt) {
  if (!updatedAt) return ''
  try {
    const diff = Date.now() - new Date(updatedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  } catch {
    return ''
  }
}

function Avatar({ name }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mobile-forest/15 text-sm font-bold text-mobile-forest">
      {initial}
    </div>
  )
}

export function InboxRow({ conversation, listingImage, to, variant = 'mobile' }) {
  const participant = conversation.participant || conversation.participant_name
  const listingTitle = conversation.listingTitle || conversation.listing_title
  const lastMessage = conversation.lastMessage || conversation.last_message
  const time = formatRelativeTime(conversation.updated_at)
  const unread = conversation.unread ?? 0

  if (variant === 'desktop') {
    return (
      <Link
        to={to}
        className="flex gap-3 border-b border-surface-border px-4 py-4 transition hover:bg-surface-hover"
      >
        <Avatar name={participant} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-ink">{participant}</p>
            {time && <span className="shrink-0 text-xs text-ink-secondary">{time}</span>}
          </div>
          {listingTitle && <p className="truncate text-xs text-ink-secondary">{listingTitle}</p>}
          <p className="mt-1 truncate text-sm text-ink-secondary">{lastMessage}</p>
        </div>
        {listingImage && (
          <img src={listingImage} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        )}
        {unread > 0 && (
          <span className="self-center rounded-full bg-brand-accent px-2 py-0.5 text-xs font-semibold text-white">
            {unread}
          </span>
        )}
      </Link>
    )
  }

  return (
    <Link to={to} className="flex gap-3 px-4 py-4 active:bg-surface-subtle">
      <Avatar name={participant} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-ink">{participant}</p>
          <div className="flex shrink-0 items-center gap-2">
            {time && <span className="text-xs text-ink-secondary">{time}</span>}
            {unread > 0 && (
              <span className="rounded-full bg-mobile-forest px-2 py-0.5 text-xs font-semibold text-white">
                {unread}
              </span>
            )}
          </div>
        </div>
        {listingTitle && <p className="truncate text-xs text-ink-secondary">{listingTitle}</p>}
        <p className="mt-1 truncate text-sm text-ink-secondary">{lastMessage}</p>
      </div>
      {listingImage && (
        <img src={listingImage} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      )}
    </Link>
  )
}

export function InboxList({
  conversations,
  listingImages = {},
  basePath = CONSUMER_ROUTES.messages,
  variant = 'mobile',
  empty,
  className = '',
}) {
  const { t } = useTranslation()

  if (!conversations.length) {
    return empty ?? (
      <p className="p-4 text-sm text-ink-secondary">{t('messagesPage.emptyInbox')}</p>
    )
  }

  const wrapClass = variant === 'desktop' ? className : `divide-y divide-surface-border ${className}`

  return (
    <div className={wrapClass}>
      {conversations.map((conv) => {
        const listingId = conv.listingId || conv.listing_id
        return (
          <InboxRow
            key={conv.id}
            conversation={conv}
            listingImage={listingId ? listingImages[listingId] : null}
            to={messageThreadPath(conv.id)}
            variant={variant}
          />
        )
      })}
    </div>
  )
}
