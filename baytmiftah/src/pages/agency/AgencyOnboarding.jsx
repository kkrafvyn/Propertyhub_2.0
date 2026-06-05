import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgencyStore } from '../../store/useAgencyStore'
import { supabase } from '../../lib/supabase'

export default function AgencyOnboarding() {
  const navigate = useNavigate()
  const { createAgency, loading, error } = useAgencyStore()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    companyName: '',
    licenseNumber: '',
    website: '',
    description: '',
    contactEmail: '',
    phoneNumber: '',
    address: '',
    city: '',
    country: 'UAE',
    agentCount: 1,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const agency = await createAgency(formData)
      navigate(`/agency/dashboard`)
    } catch (err) {
      console.error('Error creating agency:', err)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-container rounded-lg p-8">
          <h1 className="text-display-md font-bold mb-2">Create Your Agency</h1>
          <p className="text-on-surface-variant mb-8">
            Step {step} of 4 - {step === 1 ? 'Company Info' : step === 2 ? 'Contact Details' : step === 3 ? 'Verification' : 'Team Setup'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Company Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your agency name"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    placeholder="Real estate license number"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Tell us about your agency"
                    rows="4"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="agency@example.com"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+971 50 xxx xxxx"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street address"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-md font-medium mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Dubai"
                      className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-body-md font-medium mb-2">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white"
                    >
                      <option>UAE</option>
                      <option>Saudi Arabia</option>
                      <option>Kuwait</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Verification */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-surface border border-gray-600 rounded-lg p-4">
                  <h3 className="text-body-lg font-medium mb-2">Verification Required</h3>
                  <p className="text-on-surface-variant text-body-md mb-4">
                    Upload your agency documents for verification
                  </p>
                  <input
                    type="file"
                    multiple
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Team Setup */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-body-md font-medium mb-2">
                    Number of Agents
                  </label>
                  <input
                    type="number"
                    name="agentCount"
                    value={formData.agentCount}
                    onChange={handleChange}
                    min="1"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition"
                >
                  Back
                </button>
              )}
              {step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Next
                </button>
              )}
              {step === 4 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Agency'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
