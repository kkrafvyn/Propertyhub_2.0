import { useEffect, useMemo, useState } from 'react'
import MobileShell, { MobileCategoryChips, MobileHeader, MobileSearchBar } from '../../components/MobileShell'
import {
  MobileEmpty,
  MobileListingRow,
  MobileListingTile,
  MobileSectionTitle,
} from '../../components/ui/MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { syncSavedIds } from '../../lib/saved-listings'
import { fetchListings } from '../../services/marketplace-service'

const categoryIds = ['all', 'apartment', 'house', 'office']

export default function MobileHomePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [listings, setListings] = useState([])

  const categories = categoryIds.map((id) => ({ id, label: t(`categories.${id}`) }))

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return listings.filter((l) => {
      const matchCat = category === 'all' || l.type === category
      const matchQ = !q || `${l.title} ${l.location}`.toLowerCase().includes(q)
      return matchCat && matchQ
    }).slice(0, 8)
  }, [listings, search, category])

  return (
    <MobileShell>
      <MobileHeader title="BaytMiftah" subtitle={t('mobile.homesInAccra')} showLogo />
      <MobileSearchBar value={search} onChange={setSearch} placeholder={t('search.searchDestinations')} />
      <MobileCategoryChips options={categories} active={category} onChange={setCategory} />

      <section className="space-y-3 px-4 pb-4">
        <MobileSectionTitle>{t('mobile.popularHomes')}</MobileSectionTitle>
        {visible.map((listing) => (
          <MobileListingRow key={listing.id} listing={listing} to={`/m/property/${listing.id}`} />
        ))}
      </section>
    </MobileShell>
  )
}

export function MobileExplorePage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => setListings(rows))
  }, [])

  const visible = listings.filter((l) =>
    !search || `${l.title} ${l.location}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <MobileShell>
      <MobileHeader title={t('mobile.search')} subtitle={t('mobile.findNextHome')} />
      <MobileSearchBar value={search} onChange={setSearch} />
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {visible.map((listing) => (
          <MobileListingTile key={listing.id} listing={listing} to={`/m/property/${listing.id}`} />
        ))}
      </div>
    </MobileShell>
  )
}

export function MobileSavedPage() {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])

  useEffect(() => {
    syncSavedIds().then((ids) => {
      fetchListings().then(({ listings: rows }) => setListings(rows.filter((l) => ids.includes(l.id))))
    })
  }, [])

  return (
    <MobileShell>
      <MobileHeader title={t('mobile.saved')} subtitle={t('mobile.savedCount', { count: listings.length })} />
      <div className="space-y-3 px-4 pb-4">
        {listings.length === 0 ? (
          <MobileEmpty title={t('mobile.noSavedTitle')} description={t('mobile.noSavedDesc')} />
        ) : (
          listings.map((listing) => (
            <MobileListingRow key={listing.id} listing={listing} to={`/m/property/${listing.id}`} />
          ))
        )}
      </div>
    </MobileShell>
  )
}
