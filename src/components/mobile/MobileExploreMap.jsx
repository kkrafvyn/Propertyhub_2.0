import { lazy, Suspense } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'

const MapView = lazy(() => import('../MapView'))

export default function MobileExploreMap({ listings, userLocation }) {
  const { t } = useTranslation()

  return (
    <div className="mx-3 mb-4 overflow-hidden rounded-2xl border border-surface-border sm:mx-4">
      <Suspense
        fallback={
          <div className="flex h-[min(55vh,420px)] items-center justify-center bg-surface-subtle text-sm text-ink-secondary">
            {t('mobile.mapLoading')}
          </div>
        }
      >
        <div className="h-[min(55vh,420px)] [&_.leaflet-container]:min-h-[min(55vh,420px)]">
          <MapView listings={listings} zoom={userLocation?.lat != null ? 13 : 11} userLocation={userLocation} />
        </div>
      </Suspense>
    </div>
  )
}
