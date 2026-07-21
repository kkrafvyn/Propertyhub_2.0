import React, { useEffect, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/badge'
import { geointelligenceService } from '@/lib/geointelligence.service'
import { ghanaMarketService } from '@/lib/ghana-market.service'
import { MapPin, Zap, GraduationCap } from 'lucide-react'

type SelectableLocation = {
  name: string
  city: string
  region: string
  count: number
}

export default function LocationIntelligence() {
  const [selectedLocation, setSelectedLocation] = useState<SelectableLocation | null>(null)
  const [locations, setLocations] = useState<SelectableLocation[]>([])
  const [locationScore, setLocationScore] = useState<any>(null)
  const [nearbyServices, setNearbyServices] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void ghanaMarketService
      .getSelectableLocations(12)
      .then((nextLocations) => {
        if (cancelled) return
        setLocations(nextLocations)
        setSelectedLocation((current) => current || nextLocations[0] || null)
      })
      .catch((error) => {
        console.error('Failed to load locations:', error)
        if (!cancelled) {
          setLocations([])
          setSelectedLocation(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedLocation) return

    void loadLocationData(selectedLocation)
  }, [selectedLocation])

  const loadLocationData = async (location: SelectableLocation) => {
    try {
      setLoading(true)
      const [score, heatmapResult] = await Promise.all([
        geointelligenceService.getNeighborhoodIntelligence(location.name),
        geointelligenceService.getDemandHeatmap(location.city, location.region),
      ])

      setLocationScore(score)
      setNearbyServices([])
      setHeatmapData(heatmapResult.data || [])
    } catch (error) {
      console.error('Failed to load location data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !selectedLocation) {
    return <div className="text-center py-12 text-muted-foreground">Loading location data...</div>
  }

  if (locations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Location Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Analyze neighborhoods for demand, safety, and accessibility
          </p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No neighborhood data yet. Location insights will appear once listings include neighborhoods or cities.
          </p>
        </Card>
      </div>
    )
  }

  const hasScoreData = Boolean(
    locationScore?.safety_score ||
      locationScore?.investment_score ||
      locationScore?.accessibility_score
  )
  const safetyProgress = Math.min(100, (locationScore?.safety_score || 0) * 10)
  const demandProgress = Math.min(100, (locationScore?.investment_score || 0) * 10)
  const accessibilityProgress = Math.min(100, (locationScore?.accessibility_score || 0) * 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Location Intelligence</h1>
        <p className="text-muted-foreground mt-2">
          Analyze neighborhoods for demand, safety, and accessibility
        </p>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Select Location</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {locations.map((location) => (
            <Button
              key={location.name}
              variant={selectedLocation?.name === location.name ? 'default' : 'outline'}
              onClick={() => setSelectedLocation(location)}
              className="justify-start"
            >
              <MapPin className="w-4 h-4 mr-2" />
              <span className="truncate">
                {location.name}
                {location.count > 0 ? ` (${location.count})` : ''}
              </span>
            </Button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading location data...</div>
      ) : null}

      {!loading && hasScoreData && selectedLocation ? (
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold">Location Score - {selectedLocation.name}</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Safety Rating</div>
              <div className="text-3xl font-bold mt-2">{locationScore.safety_score || 0}/10</div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary accent-green-600"
                value={safetyProgress}
                max={100}
                aria-label="Safety rating"
              />
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Market Demand</div>
              <div className="text-3xl font-bold mt-2">{locationScore.investment_score || 0}/10</div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary accent-blue-600"
                value={demandProgress}
                max={100}
                aria-label="Market demand"
              />
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Accessibility</div>
              <div className="text-3xl font-bold mt-2">{locationScore.accessibility_score || 0}/10</div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary accent-purple-600"
                value={accessibilityProgress}
                max={100}
                aria-label="Accessibility rating"
              />
            </Card>
          </div>

          {locationScore.summary ? (
            <Card className="p-4 bg-secondary/50">
              <h3 className="font-semibold mb-2">Location Summary</h3>
              <p className="text-sm text-muted-foreground">{locationScore.summary}</p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {!loading && nearbyServices.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Nearby Services & Amenities</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {nearbyServices.map((service, idx) => {
              const icons: { [key: string]: any } = {
                school: GraduationCap,
                hospital: Zap,
                shopping: MapPin
              }
              const Icon = icons[service.service_type] || MapPin
              
              return (
                <Card key={idx} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{service.service_name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{service.service_type}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-semibold">{service.distance_km?.toFixed(1) || 0} km away</span>
                        {service.quality_rating ? (
                          <Badge variant="outline" className="text-xs">
                            {service.quality_rating}/5
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {!loading && heatmapData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Demand Heatmap</h2>
          <Card className="p-6">
            <div className="grid grid-cols-10 gap-1">
              {heatmapData.map((cell, idx) => {
                const intensity = cell.demand_intensity || cell.listing_count || 0
                const colors: { [key: number]: string } = {
                  0: 'bg-slate-200',
                  1: 'bg-blue-200',
                  2: 'bg-blue-400',
                  3: 'bg-blue-600',
                  4: 'bg-orange-400',
                  5: 'bg-red-600'
                }
                return (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded ${colors[Math.min(5, Math.floor(intensity / 20))]}`}
                    title={`Demand: ${intensity}`}
                  />
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
