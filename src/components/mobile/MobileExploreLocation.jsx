import { IconPin, IconSliders } from '../icons'
import { useTranslation } from '../../i18n/LocaleContext'
import { nearestNeighborhoodLabel } from '../../lib/geo-distance'

export function MobileExploreSearchRow({ value, onChange, placeholder, onFiltersClick }) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 px-4 pb-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-surface-subtle px-4 py-3.5">
        <svg className="h-4 w-4 shrink-0 text-ink-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t('mobile.searchListings')}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
      </div>
      <button
        type="button"
        onClick={onFiltersClick}
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface text-ink"
        aria-label={t('mobile.filters')}
      >
        <IconSliders className="h-4 w-4" />
      </button>
    </div>
  )
}

export function MobileLocationBar({ location, onRequest, onClear, onRefresh }) {
  const { t } = useTranslation()

  if (location.status === 'idle') {
    return (
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={onRequest}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-mobile-forest/40 bg-mobile-forest/5 px-4 py-3 text-sm font-semibold text-mobile-forest"
        >
          <IconPin className="h-4 w-4" />
          {t('mobile.useMyLocation')}
        </button>
      </div>
    )
  }

  if (location.status === 'loading') {
    return (
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-surface-subtle px-4 py-3 text-sm text-ink-secondary">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-mobile-forest border-t-transparent" />
        {t('mobile.locatingYou')}
      </div>
    )
  }

  if (location.status === 'denied' || location.status === 'error') {
    return (
      <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="text-sm font-medium text-ink">{t('mobile.locationDenied')}</p>
        <button type="button" onClick={onRequest} className="mt-2 text-sm font-semibold text-mobile-forest underline">
          {t('mobile.locationRetry')}
        </button>
      </div>
    )
  }

  const area = nearestNeighborhoodLabel(location.lat, location.lng)

  return (
    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-mobile-forest/10 px-3 py-2.5">
      <IconPin className="h-4 w-4 shrink-0 text-mobile-forest" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {area ? t('mobile.nearArea', { area }) : t('mobile.nearYou')}
        </p>
        <p className="text-xs text-ink-secondary">
          {location.live ? t('mobile.liveLocation') : t('mobile.sortingByDistance')}
        </p>
      </div>
      <button type="button" onClick={onRefresh} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-mobile-forest">
        {t('mobile.refreshLocation')}
      </button>
      <button type="button" onClick={onClear} className="shrink-0 text-xs font-semibold text-ink-secondary underline">
        {t('common.close')}
      </button>
    </div>
  )
}

export function MobileExploreFiltersSheet({ open, onClose, filters, onChange }) {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{t('mobile.filters')}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-ink-secondary">{t('common.close')}</button>
        </div>
        <label className="mb-4 flex items-center justify-between text-sm">
          <span className="font-medium">{t('filters.verifiedOnly')}</span>
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
            className="h-4 w-4 rounded border-surface-border"
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">{t('filters.minBedrooms')}</span>
          <select
            className="w-full rounded-lg border border-surface-border px-3 py-2"
            value={filters.minBedrooms}
            onChange={(e) => onChange({ ...filters, minBedrooms: Number(e.target.value) })}
          >
            <option value={0}>{t('filters.any')}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl bg-mobile-forest py-3 text-sm font-semibold text-white">
          {t('home.showResults')}
        </button>
      </div>
    </div>
  )
}
