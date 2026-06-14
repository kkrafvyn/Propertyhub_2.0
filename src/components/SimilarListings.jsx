import { Link } from 'react-router-dom'
import ListingCard from './ListingCard'
import { useTranslation } from '../i18n/LocaleContext'

export default function SimilarListings({ listings, currentId }) {
  const { t } = useTranslation()
  const similar = listings.filter((l) => l.id !== currentId).slice(0, 4)
  if (!similar.length) return null

  return (
    <section className="mt-16 border-t border-surface-border pt-10">
      <h2 className="mb-6 text-xl font-semibold">{t('similar.title')}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {similar.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold underline">{t('similar.browseMore')}</Link>
    </section>
  )
}
