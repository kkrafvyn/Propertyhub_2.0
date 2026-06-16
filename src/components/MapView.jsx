import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LocaleContext'
import 'leaflet/dist/leaflet.css'

const pin = L.divIcon({
  className: '',
  html: `<div style="background:#FF385C;color:#fff;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:10px;">●</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

const userDot = L.divIcon({
  className: '',
  html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export default function MapView({ listings, center = [5.6037, -0.187], zoom = 12, userLocation = null }) {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    return () => setReady(false)
  }, [])

  const mappable = (listings ?? []).filter((l) => l.lat != null && l.lng != null)
  const mapCenter = userLocation?.lat != null ? [Number(userLocation.lat), Number(userLocation.lng)] : center
  const mapKey = `${Number(mapCenter[0]).toFixed(4)}-${Number(mapCenter[1]).toFixed(4)}-${zoom}`

  if (!ready) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-surface-subtle text-sm text-ink-secondary">
        {t('mobile.mapLoading')}
      </div>
    )
  }

  return (
    <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-surface-border">
      <MapContainer key={mapKey} center={mapCenter} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation?.lat != null && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userDot} />
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={Math.min(userLocation.accuracy ?? 120, 400)}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.12, weight: 1 }}
            />
          </>
        )}
        {mappable.map((listing) => (
          <Marker key={listing.id} position={[listing.lat, listing.lng]} icon={pin}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-ink">{listing.title}</p>
                {listing.distanceLabel && (
                  <p className="text-xs font-semibold text-mobile-forest">{listing.distanceLabel} away</p>
                )}
                <p className="text-sm text-ink-secondary">{listing.priceLabel}</p>
                <Link to={`/property/${listing.id}`} className="mt-2 inline-block text-sm font-semibold text-ink underline">
                  {t('listing.viewProperty')}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
