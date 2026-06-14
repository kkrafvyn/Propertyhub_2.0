import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { EmptyPanel, PageTitle, PrimaryButton, TablePanel, TextLink } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchListings } from '../services/marketplace-service'
import { getCompareIds, clearCompare } from '../lib/compare-listings'

export default function ComparePage() {
  const { t } = useTranslation()
  const [listings, setListings] = useState([])
  const ids = getCompareIds()

  useEffect(() => {
    fetchListings().then(({ listings: rows }) => {
      setListings(rows.filter((l) => ids.includes(l.id)))
    })
  }, [ids.join(',')])

  const rows = [
    { label: t('comparePage.price'), key: 'priceLabel' },
    { label: t('comparePage.location'), key: 'location' },
    { label: t('comparePage.bedrooms'), key: 'bedrooms' },
    { label: t('comparePage.bathrooms'), key: 'bathrooms' },
    { label: t('comparePage.sqft'), key: 'sqft' },
    { label: t('comparePage.rating'), key: 'rating' },
    { label: t('comparePage.type'), key: 'type' },
    { label: t('comparePage.verified'), key: 'verified' },
  ]

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle
        title={t('comparePage.title')}
        subtitle={t('comparePage.subtitle')}
        action={listings.length > 0 && (
          <button type="button" onClick={clearCompare} className="text-sm font-medium text-ink-secondary underline">
            {t('common.clearAll')}
          </button>
        )}
      />

      {listings.length === 0 ? (
        <EmptyPanel
          title={t('comparePage.emptyTitle')}
          description={t('comparePage.emptyDesc')}
          action={<PrimaryButton as={Link} to="/">{t('common.browseHomes')}</PrimaryButton>}
        />
      ) : (
        <TablePanel>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-surface-border bg-surface-subtle p-3 text-left" />
                {listings.map((l) => (
                  <th key={l.id} className="min-w-[200px] border border-surface-border p-3 text-left">
                    <img src={l.image} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
                    <Link to={`/property/${l.id}`} className="font-semibold hover:underline">{l.title}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, key }) => (
                <tr key={key}>
                  <td className="border border-surface-border bg-surface-subtle p-3 font-medium">{label}</td>
                  {listings.map((l) => (
                    <td key={l.id} className="border border-surface-border p-3">
                      {key === 'verified' ? (l.verified ? t('common.yes') : t('common.no')) : l[key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      )}

      <div className="mt-8 flex gap-4">
        <TextLink to="/tools/mortgage">{t('comparePage.mortgageEstimator')}</TextLink>
        <TextLink to="/tools/investment">{t('comparePage.investmentCalculator')}</TextLink>
      </div>
    </DesktopShell>
  )
}
