import React from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

const checks = [
  ['Identity', 'Verified government ID and selfie match', 'complete'],
  ['Funds', 'Proof of funds or mortgage pre-approval', 'review'],
  ['Documents', 'Reusable documents ready for agents and owners', 'complete'],
  ['References', 'Employer or landlord reference request', 'pending'],
]

export default function VerificationPassport() {
  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Verification Passport" />
        <div className="page-shell">
          <div className="content-shell grid gap-5 lg:grid-cols-[320px_1fr]">
            <aside className="panel bg-[#111827] text-white">
              <p className="text-sm uppercase tracking-widest text-[#E9C349]">Buyer readiness</p>
              <p className="mt-4 text-5xl font-semibold">82%</p>
              <p className="mt-4 text-sm leading-6 text-white/75">
                Reusable trust profile for bookings, offers, owner approvals, and agency handoffs.
              </p>
            </aside>
            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Passport checklist</h2>
              <div className="mt-5 grid gap-3">
                {checks.map(([title, body, status]) => (
                  <article key={title} className="grid gap-3 rounded-md bg-surface p-4 md:grid-cols-[1fr_120px]">
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">{body}</p>
                    </div>
                    <span className="self-start rounded-md bg-surface-container px-3 py-2 text-center text-sm font-bold capitalize text-secondary">
                      {status}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
