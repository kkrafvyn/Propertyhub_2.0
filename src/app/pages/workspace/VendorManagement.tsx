import { useEffect, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/badge'
import { vendorService } from '@/lib/vendor.service'
import { Star, Wrench, MapPin, Phone } from 'lucide-react'

export default function VendorManagement() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')

  const categories = [
    'all',
    'electrician',
    'plumber',
    'cleaner',
    'mover',
    'painter',
    'carpenter',
    'internet_provider',
    'security'
  ]

  useEffect(() => {
    loadVendors()
  }, [filterCategory])

  const loadVendors = async () => {
    try {
      setLoading(true)
      let data: any[] = []
      
      if (filterCategory === 'all') {
        // Load all verified vendors
        for (const cat of categories.slice(1)) {
          const result = await vendorService.getVerifiedVendors(cat, 5)
          data = [...data, ...result]
        }
      } else {
        data = await vendorService.getVerifiedVendors(filterCategory, 20)
      }
      
      setVendors(data || [])
    } catch (error) {
      console.error('Failed to load vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleHireVendor = async (vendorId: string) => {
    const vendor = vendors.find((item) => item.id === vendorId)
    alert(`${vendor?.business_name || 'Vendor'} hired! Check your assignments.`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor & Contractor Ecosystem</h1>
        <p className="text-muted-foreground mt-2">Find and hire verified contractors for maintenance and repairs</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={filterCategory === cat ? 'default' : 'outline'}
            onClick={() => setFilterCategory(cat)}
            className="capitalize"
          >
            {cat === 'internet_provider' ? 'Internet' : cat}
          </Button>
        ))}
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">
          Loading vendors...
        </Card>
      ) : vendors.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No vendors found in this category
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{vendor.business_name}</h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(vendor.rating_avg || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {vendor.rating_avg || 0}/5
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({vendor.total_jobs_completed || 0} jobs)
                    </span>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{vendor.business_category}</span>
                    </div>
                    
                    {vendor.service_areas && vendor.service_areas.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.service_areas.join(', ')}</span>
                      </div>
                    )}

                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline" className="capitalize">
                      {vendor.availability_status}
                    </Badge>
                    {vendor.verified && (
                      <Badge className="bg-green-600">Verified</Badge>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handleHireVendor(vendor.id)}
                  disabled={vendor.availability_status === 'unavailable'}
                >
                  Hire
                </Button>
              </div>

              {/* Services */}
              {vendor.services && vendor.services.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Services:</p>
                  <div className="space-y-1">
                    {vendor.services.slice(0, 2).map((service: any) => (
                      <div key={service.id} className="text-xs">
                        <span className="font-medium">{service.service_name}</span>
                        <span className="text-muted-foreground ml-2">
                          GHS {service.base_price?.toLocaleString() || 0}
                        </span>
                      </div>
                    ))}
                    {vendor.services.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{vendor.services.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
