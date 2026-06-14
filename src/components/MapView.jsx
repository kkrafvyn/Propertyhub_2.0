import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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

export default function MapView({ listings, center = [5.6037, -0.187], zoom = 12 }) {
  const { t } = useTranslation()
  const mappable = listings.filter((l) => l.lat && l.lng)

  return (
    <div className="h-full min-h-[520px] overflow-hidden rounded-xl border border-surface-border">
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.map((listing) => (
          <Marker key={listing.id} position={[listing.lat, listing.lng]} icon={pin}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-ink">{listing.title}</p>
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
