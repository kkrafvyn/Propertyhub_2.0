import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgencyStore } from '../../store/useAgencyStore'

const steps = ['Agency Identity', 'Verification', 'Team Setup', 'Confirmation']

export default function AgencyOnboarding() {
  const navigate = useNavigate()
  const { createAgency, loading, error } = useAgencyStore()
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    taxId: '',
    website: '',
    email: '',
    phone: '',
    description: '',
  })

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    await createAgency({
      name: formData.name,
      slug: formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      ghana_business_registration_number: formData.registrationNumber,
      ghana_tax_identification_number: formData.taxId || null,
      website: formData.website || null,
      email: formData.email || null,
      phone: formData.phone || null,
      description: formData.description || null,
      verification_submitted_at: new Date().toISOString(),
    })

    navigate('/agency/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fc] text-[#071121]">
      <header className="flex h-20 items-center justify-between border-b border-[#cbd3df] bg-white px-8">
        <h1 className="text-3xl font-black">PropFlow Agency</h1>
        <div className="flex items-center gap-7">
          <span className="material-symbols-outlined">notifications</span>
          <span className="material-symbols-outlined">settings</span>
          <img
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80"
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-8 py-16 lg:grid-cols-[520px_minmax(0,1fr)]">
        <aside className="space-y-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-10">
            <h2 className="text-3xl font-bold">Onboarding</h2>
            <div className="mt-12 space-y-8">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-6 rounded-md px-6 py-5 ${
                    index === 0 ? 'border-l-4 border-[#007a52] bg-[#62efad]' : 'text-[#9ba4b2]'
                  }`}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-full border ${index === 0 ? 'border-[#007a52] bg-[#007a52] text-white' : 'border-[#d8dde6]'}`}>
                    {index + 1}
                  </span>
                  <span className="font-bold tracking-widest">{step}</span>
                </div>
              ))}
            </div>
            <p className="mt-20 border-t border-[#d8dde6] pt-10 text-lg leading-8 text-[#303744]">
              Setting up your agency profile ensures compliance and unlocks the full suite
              of PropFlow&apos;s IoT management tools.
            </p>
          </section>

          <section className="rounded-lg bg-[#111827] p-8 text-white">
            <p className="font-bold uppercase tracking-widest text-[#62efad]">
              <span className="material-symbols-outlined mr-2 align-middle">lightbulb</span>
              Expert Tip
            </p>
            <p className="mt-5 text-xl italic leading-8 text-[#aab3c2]">
              "Having your trade license and tax ID ready will speed up the verification
              process by 40%."
            </p>
          </section>
        </aside>

        <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
          <div className="h-2 w-1/4 bg-[#007a52]" />
          <form
            onSubmit={handleSubmit}
          >
            <div className="p-10">
              <h2 className="text-3xl font-bold">Agency Identity</h2>
              <p className="mt-3 text-2xl text-[#303744]">
                Provide the foundational details of your enterprise.
              </p>

              <div className="mt-12 grid gap-8 md:grid-cols-2">
                <label className="block">
                  <span className="font-bold tracking-widest">Agency Name</span>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="e.g. Global Realty Partners"
                    className="mt-3 h-14 w-full rounded border border-[#b9c3d2] bg-white px-5 text-xl outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-bold tracking-widest">License Number</span>
                  <input
                    required
                    value={formData.registrationNumber}
                    onChange={(event) => updateField('registrationNumber', event.target.value)}
                    placeholder="TX-9920-X12"
                    className="mt-3 h-14 w-full rounded border border-[#b9c3d2] bg-white px-5 text-xl outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-bold tracking-widest">Website</span>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(event) => updateField('website', event.target.value)}
                    placeholder="https://agency.example"
                    className="mt-3 h-14 w-full rounded border border-[#b9c3d2] bg-white px-5 text-xl outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-bold tracking-widest">Tax ID</span>
                  <input
                    value={formData.taxId}
                    onChange={(event) => updateField('taxId', event.target.value)}
                    placeholder="Ghana TIN"
                    className="mt-3 h-14 w-full rounded border border-[#b9c3d2] bg-white px-5 text-xl outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-bold tracking-widest">Contact Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="ops@agency.example"
                    className="mt-3 h-14 w-full rounded border border-[#b9c3d2] bg-white px-5 text-xl outline-none"
                  />
                </label>
                <label className="block">
                  <span className="font-bold tracking-widest">Phone</span>
                  <input
                    value={formData.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    placeholder="+233..."
                    className="mt-3 h-14 w-full rounded border border-[#b9c3d2] bg-white px-5 text-xl outline-none"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="font-bold tracking-widest">Company Bio</span>
                  <textarea
                    rows="4"
                    value={formData.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Briefly describe your agency's mission..."
                    className="mt-3 w-full rounded border border-[#b9c3d2] bg-white px-5 py-4 text-xl outline-none"
                  />
                </label>
              </div>
            </div>

            <footer className="flex justify-end border-t border-[#cbd3df] p-10">
              {error && <p className="mr-auto text-red-600">{error}</p>}
              <button
                disabled={loading}
                className="rounded-md bg-black px-16 py-4 text-xl font-bold text-white disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Continue'}
              </button>
            </footer>
          </form>
        </section>
      </main>
    </div>
  )
}
