import React, { useEffect, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/badge'
import { geointelligenceService } from '@/lib/geointelligence.service'
import { MapPin, TrendingUp, Zap, GraduationCap } from 'lucide-react'

export default function LocationIntelligence() {
  const [selectedLocation, setSelectedLocation] = useState('East Legon')
  const [locationScore, setLocationScore] = useState<any>(null)
  const [nearbyServices, setNearbyServices] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const locations = ['East Legon', 'Cantonments', 'Osu', 'Accra Mall', 'Kanda', 'Dzorwulu']

  useEffect(() => {
    loadLocationData()
  }, [selectedLocation])

  const loadLocationData = async () => {
    try {
      setLoading(true)
      const [score, services, heatmap] = await Promise.all([
        geointelligenceService.getLocationScore(selectedLocation),
        geointelligenceService.getNearbyServices(selectedLocation),
        geointelligenceService.getDemandHeatmap('Accra', 10, 10)
      ])

      setLocationScore(score)
      setNearbyServices(services || [])
      setHeatmapData(heatmap || [])
    } catch (error) {
      console.error('Failed to load location data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading location data...</div>
  }

  const safetyProgress = Math.min(100, (locationScore?.safety_rating || 0) * 10)
  const investmentProgress = Math.min(100, (locationScore?.investment_score || 0) * 10)
  const accessibilityProgress = Math.min(100, (locationScore?.accessibility_rating || 0) * 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Location Intelligence</h1>
        <p className="text-muted-foreground mt-2">Analyze neighborhoods and identify investment opportunities</p>
      </div>

      {/* Location Selector */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Select Location</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {locations.map(loc => (
            <Button
              key={loc}
              variant={selectedLocation === loc ? 'default' : 'outline'}
              onClick={() => setSelectedLocation(loc)}
              className="justify-start"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {loc}
            </Button>
          ))}
        </div>
      </Card>

      {/* Location Score */}
      {locationScore && (
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold">Location Score - {selectedLocation}</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Safety Rating</div>
              <div className="text-3xl font-bold mt-2">{locationScore.safety_rating || 0}/10</div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary accent-green-600"
                value={safetyProgress}
                max={100}
                aria-label="Safety rating"
              />
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Investment Potential</div>
              <div className="text-3xl font-bold mt-2">{locationScore.investment_score || 0}/10</div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary accent-blue-600"
                value={investmentProgress}
                max={100}
                aria-label="Investment potential"
              />
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Accessibility</div>
              <div className="text-3xl font-bold mt-2">{locationScore.accessibility_rating || 0}/10</div>
              <progress
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary accent-purple-600"
                value={accessibilityProgress}
                max={100}
                aria-label="Accessibility rating"
              />
            </Card>
          </div>

          {/* Summary */}
          <Card className="p-4 bg-secondary/50">
            <h3 className="font-semibold mb-2">Location Summary</h3>
            <p className="text-sm text-muted-foreground">{locationScore.summary}</p>
          </Card>
        </div>
      )}

      {/* Nearby Services */}
      {nearbyServices.length > 0 && (
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
                        <Badge variant="outline" className="text-xs">
                          {service.quality_rating || 4}/5 ⭐
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Demand Heatmap */}
      {heatmapData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Demand Heatmap</h2>
          <Card className="p-6">
            <div className="grid grid-cols-10 gap-1">
              {heatmapData.map((cell, idx) => {
                const intensity = cell.demand_intensity || 0
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
            <div className="flex items-center justify-between mt-4 text-xs">
              <span className="text-muted-foreground">Low demand</span>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded ${
                      ['bg-slate-200', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-orange-400', 'bg-red-600'][i]
                    }`}
                  />
                ))}
              </div>
              <span className="text-muted-foreground">High demand</span>
            </div>
          </Card>
        </div>
      )}

      {/* Investment Insights */}
      <Card className="p-6 border-green-200 bg-green-50/50">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-green-200 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold">Investment Opportunity</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLocation} shows strong growth potential with improving infrastructure and 15% year-over-year appreciation.
              Consider this area for long-term investment.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
