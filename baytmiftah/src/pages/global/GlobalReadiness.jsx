import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { globalLaunchSequence, globalReadinessModules } from '../../data/global-readiness-modules'

export default function GlobalReadiness() {
  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title="Global" />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">
              Worldwide readiness layer
            </p>
            <div className="mt-3 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-5xl">
                  Country-aware compliance, payments, localization, legal flows, and data residency.
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-[#4b5563] md:text-lg">
                  This layer makes Property Hub adaptable by market. It decides what users can do, what data is
                  required, which transactions are legal, and how each country should localize property workflows.
                </p>
              </div>

              <div className="rounded-lg bg-[#071121] p-6 text-white">
                <p className="text-sm text-white/70">Global operating modules</p>
                <p className="mt-2 text-5xl font-black">{globalReadinessModules.length}</p>
                <p className="mt-4 text-sm leading-6 text-white/70">
                  Compliance is the first deployment gate. Payments, legal, KYC, localization, and data residency follow
                  from the selected country profile.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {globalReadinessModules.map((module) => (
              <Link
                key={module.id}
                to={`/global/${module.id}`}
                className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#007a52] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#e9fbf6] text-[#007a52]">
                    <span className="material-symbols-outlined">{module.icon}</span>
                  </span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-xs font-bold text-[#303744]">
                    {module.status}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black">{module.title}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-[#4b5563]">{module.summary}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#e5e7eb] pt-4 text-sm font-bold">
                  <span>{module.capabilities.length} controls</span>
                  <span className="material-symbols-outlined text-[#007a52]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </section>

          <section className="mt-8 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">Launch path</p>
                <h2 className="mt-2 text-3xl font-black">Global rollout sequence</h2>
              </div>
              <Link to="/global/compliance-engine" className="btn-secondary inline-flex items-center gap-2">
                <span className="material-symbols-outlined">policy</span>
                Compliance engine
              </Link>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {globalLaunchSequence.map((step, index) => (
                <div key={step} className="rounded-md bg-[#f8faff] p-4">
                  <span className="text-sm font-black text-[#007a52]">Phase {index + 1}</span>
                  <p className="mt-2 font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
