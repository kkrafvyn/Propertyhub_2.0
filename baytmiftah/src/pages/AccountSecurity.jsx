import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { accountService } from '../services/production-service'

export default function AccountSecurity() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('baytmiftah_user') || '{}')
    } catch {
      return {}
    }
  })()
  const [profile, setProfile] = useState({
    displayName: storedUser.name || '',
    role: storedUser.role || 'buyer',
    phone: storedUser.phone || '',
  })
  const [status, setStatus] = useState('')
  const [mfa, setMfa] = useState(null)

  const completeProfile = async (event) => {
    event.preventDefault()
    const result = await accountService.completeProfile(profile)
    setStatus(`Profile completion saved for ${result.displayName || 'this account'}.`)
  }

  const startMfa = async () => {
    const result = await accountService.startMfaEnrollment()
    setMfa(result.data || null)
    setStatus(result.error ? result.error.message : 'MFA enrollment started.')
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Account Security" />
        <div className="page-shell">
          <div className="content-shell grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Profile completion</h2>
              <p className="mt-2 text-on-surface-variant">
                Social login creates the account first. Complete role and contact details here before agency, owner, or admin workflows depend on them.
              </p>
              <form onSubmit={completeProfile} className="mt-6 grid gap-4 md:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold">Display name</span>
                  <input
                    className="input-field mt-2"
                    value={profile.displayName}
                    onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold">Phone</span>
                  <input
                    className="input-field mt-2"
                    value={profile.phone}
                    onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className="text-sm font-semibold">Role</span>
                  <select
                    className="input-field mt-2"
                    value={profile.role}
                    onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="buyer">Buyer</option>
                    <option value="renter">Renter / Tenant</option>
                    <option value="property_owner">Property owner</option>
                    <option value="independent_agent">Independent agent</option>
                    <option value="property_developer">Property developer</option>
                    <option value="property_manager">Property manager</option>
                  </select>
                </label>
                <button className="btn-primary w-fit">Save profile</button>
              </form>
              {status && <p className="mt-5 rounded-md bg-secondary/10 p-3 text-sm text-secondary">{status}</p>}
            </section>

            <aside className="space-y-6">
              <section className="panel">
                <h2 className="text-xl font-semibold text-secondary">MFA readiness</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Start TOTP enrollment after Supabase MFA is enabled for the project.
                </p>
                <button onClick={startMfa} className="btn-secondary mt-5 w-full justify-center">
                  Start MFA setup
                </button>
                {mfa?.totp?.qr_code && (
                  <div className="mt-5 rounded-md bg-white p-3">
                    <img src={mfa.totp.qr_code} alt="MFA QR code" className="mx-auto" />
                  </div>
                )}
              </section>
              <section className="panel">
                <h2 className="text-xl font-semibold text-secondary">OAuth providers</h2>
                <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
                  <li>Google login: wired in the frontend.</li>
                  <li>Apple login: wired in the frontend.</li>
                  <li>Provider credentials: configured in Supabase Auth.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
