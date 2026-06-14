import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import { IconHeart } from '../../components/icons'
import {
  MobileLinkRow,
  MobilePrimaryButton,
  MobileTextLink,
  MobileBadge,
} from '../../components/ui/MobileUI'
import { fetchConversation, fetchConversations } from '../../services/messaging-service'
import { syncSavedIds, toggleSavedIdAsync } from '../../lib/saved-listings'
import { LanguagePanel } from '../../components/LanguageSwitcher'
import { useTranslation } from '../../i18n/LocaleContext'

export function MobileMessagesPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)

  useEffect(() => {
    fetchConversations().then(({ conversations: rows }) => setConversations(rows))
  }, [])

  useEffect(() => {
    if (id) fetchConversation(id).then(({ conversation }) => setActive(conversation))
    else setActive(null)
  }, [id])

  if (active) {
    return (
      <MobileShell hideNav>
        <MobileHeader title={active.participant} subtitle={active.listingTitle} backTo="/m/messages" />
        <div className="space-y-2 px-4 py-4 pb-20">
          {active.messages?.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender === 'You' ? 'ml-auto bg-ink text-white' : 'bg-surface-subtle text-ink'
              }`}
            >
              {msg.body}
            </div>
          ))}
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell>
      <MobileHeader title={t('mobile.inbox')} subtitle={t('mobile.inboxSubtitle')} />
      <div className="divide-y divide-surface-border">
        {conversations.map((conv) => (
          <Link key={conv.id} to={`/m/messages/${conv.id}`} className="block px-4 py-4">
            <p className="font-semibold text-ink">{conv.participant}</p>
            <p className="truncate text-sm text-ink-secondary">{conv.lastMessage}</p>
          </Link>
        ))}
      </div>
    </MobileShell>
  )
}

export function MobileProfilePage() {
  const { t } = useTranslation()

  return (
    <MobileShell>
      <MobileHeader title={t('mobile.profile')} subtitle={t('mobile.profileSubtitle')} />
      <div className="space-y-4 px-4 pb-4">
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-ink">{t('profile.language')}</p>
          <LanguagePanel />
        </div>
        <MobileLinkRow to="/profile">{t('mobile.accountSettings')}</MobileLinkRow>
        <MobileLinkRow to="/trips">{t('menu.trips')}</MobileLinkRow>
        <MobileLinkRow to="/m/agent">{t('mobile.agentWorkspace')}</MobileLinkRow>
        <MobileLinkRow to="/buyer">{t('mobile.buyerWorkspace')}</MobileLinkRow>
        <MobileLinkRow to="/documents">{t('menu.documents')}</MobileLinkRow>
        <MobileLinkRow to="/m/renter">{t('mobile.renterWorkspace')}</MobileLinkRow>
        <MobileLinkRow to="/manage">{t('mobile.propertyManagement')}</MobileLinkRow>
        <MobileLinkRow to="/m/agency">{t('mobile.agencyWorkspace')}</MobileLinkRow>
        <MobileLinkRow to="/m/finance">{t('mobile.financeWorkspace')}</MobileLinkRow>
        <MobileLinkRow to="/admin">{t('menu.admin')}</MobileLinkRow>
        <MobileLinkRow to="/login">{t('auth.logIn')}</MobileLinkRow>
      </div>
    </MobileShell>
  )
}

export function MobilePropertyPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [saved, setSaved] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    import('../../services/marketplace-service').then(({ fetchListingById }) => {
      fetchListingById(id).then(({ listing: row }) => setListing(row))
    })
  }, [id])

  useEffect(() => {
    syncSavedIds().then((ids) => setSaved(ids.includes(id)))
  }, [id])

  if (!listing) {
    return (
      <MobileShell hideNav>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
        </div>
      </MobileShell>
    )
  }

  const photos = listing.photos?.length ? listing.photos : [listing.image]

  async function handleToggleSave() {
    const next = await toggleSavedIdAsync(listing.id)
    setSaved(next.includes(listing.id))
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={listing.title} subtitle={listing.location} backTo="/m/explore" />
      <div className="relative">
        <img
          src={photos[photoIndex]}
          alt={listing.title}
          className="aspect-[4/3] w-full object-cover"
        />
        <button
          type="button"
          onClick={handleToggleSave}
          className="absolute right-4 top-4 rounded-full bg-surface/90 p-2 shadow-sm"
          aria-label={saved ? t('listing.unsave') : t('listing.save')}
        >
          <IconHeart
            className={`h-6 w-6 ${saved ? 'fill-brand-accent text-brand-accent' : 'text-ink'}`}
            filled={saved}
          />
        </button>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 px-2.5 py-1 text-lg shadow-sm"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 px-2.5 py-1 text-lg shadow-sm"
              aria-label="Next photo"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${index === photoIndex ? 'bg-surface' : 'bg-surface/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="space-y-4 px-4 py-4 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          {listing.featured && <MobileBadge tone="accent">{t('listing.guestFavourite')}</MobileBadge>}
          {listing.propertyType && <MobileBadge>{listing.propertyType}</MobileBadge>}
        </div>
        <p className="text-xl font-semibold text-ink">{listing.priceLabel}</p>
        <p className="text-sm leading-relaxed text-ink-secondary">{listing.description}</p>
        {listing.amenities?.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t('listing.whatOffers')}</p>
            <ul className="space-y-1.5 text-sm text-ink-secondary">
              {listing.amenities.slice(0, 6).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
        <MobilePrimaryButton as={Link} to="/login" className="block w-full text-center">
          {t('listing.requestViewing')}
        </MobilePrimaryButton>
        <MobileTextLink to="/m/explore" className="block text-center">{t('listing.backToSearch')}</MobileTextLink>
      </div>
    </MobileShell>
  )
}
