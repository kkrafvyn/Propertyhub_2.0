import { useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n/LocaleContext'
import { buildListingChatIntro } from '../../../lib/baytmiftah/listing-links'
import { openListingConversation } from '../../../lib/baytmiftah/messaging-service'
import { messageThreadPath, CONSUMER_ROUTES, propertyPath } from '../../../lib/consumer-routes'

export default function MessageHostButton({
  listing,
  className = '',
  variant = 'secondary',
  initialMessage,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!user) {
      navigate(CONSUMER_ROUTES.login, { state: { from: propertyPath(listing.id) } })
      return
    }

    setLoading(true)
    try {
      const intro = initialMessage
        ? buildListingChatIntro({
            listingId: listing.id,
            listingTitle: listing.title,
            introLine: initialMessage,
          })
        : buildListingChatIntro({
            listingId: listing.id,
            listingTitle: listing.title,
            introLine: t('messagesPage.defaultIntro', { title: listing.title }),
          })

      const result = await openListingConversation({
        listingId: listing.id,
        listingTitle: listing.title,
        participantName: listing.host || t('mobile.verifiedAgent'),
        hostUserId: listing.hostUserId,
        initialMessage: intro,
      })
      if (result.conversationId) {
        navigate(messageThreadPath(result.conversationId))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open conversation')
    } finally {
      setLoading(false)
    }
  }

  const base = variant === 'primary'
    ? 'rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'
    : 'rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60'

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={`${base} ${className}`}>
      {loading ? t('messagesPage.opening') : t('mobile.messageAgent')}
    </button>
  )
}
