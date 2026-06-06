import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAgencyStore } from '../../store/useAgencyStore'

export default function AgencyProfile() {
  const { agencyId } = useParams()
  const { currentAgency, fetchAgencyById, loading } = useAgencyStore()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (agencyId) {
      fetchAgencyById(agencyId)
    }
  }, [agencyId])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!currentAgency) {
    return <div className="flex items-center justify-center min-h-screen">Agency not found</div>
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-secondary h-48 md:h-64" />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-10">
        {/* Header */}
        <div className="bg-surface-container rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-5xl text-gray-500">📍</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-display-md font-bold">{currentAgency.name}</h1>
                {currentAgency.verified && (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-body-sm">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant mb-4">{currentAgency.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-body-sm">
                <div>
                  <span className="text-gray-400">Location</span>
                  <p className="text-white">{currentAgency.city}, {currentAgency.country}</p>
                </div>
                <div>
                  <span className="text-gray-400">Agents</span>
                  <p className="text-white">{currentAgency.agent_count}</p>
                </div>
                <div>
                  <span className="text-gray-400">Year Founded</span>
                  <p className="text-white">{currentAgency.years_in_business} years</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-surface-container rounded-lg overflow-hidden">
          <div className="border-b border-gray-700 flex">
            {['overview', 'listings', 'agents', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-body-lg font-medium mb-4">Contact Information</h3>
                  <div className="space-y-3 text-body-md">
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <p className="text-white">{currentAgency.contact_email}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Phone:</span>
                      <p className="text-white">{currentAgency.phone_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Website:</span>
                      <p className="text-primary">{currentAgency.website}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Address:</span>
                      <p className="text-white">{currentAgency.address}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-body-lg font-medium mb-4">About</h3>
                  <p className="text-on-surface-variant text-body-md leading-relaxed">
                    {currentAgency.description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'listings' && (
              <div className="text-center py-12">
                <p className="text-on-surface-variant">No listings yet</p>
              </div>
            )}

            {activeTab === 'agents' && (
              <div className="text-center py-12">
                <p className="text-on-surface-variant">Agent list coming soon</p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="text-center py-12">
                <p className="text-on-surface-variant">No reviews yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
