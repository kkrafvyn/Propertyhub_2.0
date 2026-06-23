import { IconPin, IconSliders } from '../icons'
import { useTranslation } from '../../i18n/LocaleContext'
import { nearestNeighborhoodLabel } from '../../lib/geo-distance'

export function MobileExploreSearchRow({ value, onChange, placeholder, onFiltersClick, activeFilterCount = 0 }) {
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
        className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface text-ink"
        aria-label={t('mobile.filters')}
      >
        <IconSliders className="h-4 w-4" />
        {activeFilterCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-mobile-forest px-1 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
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
