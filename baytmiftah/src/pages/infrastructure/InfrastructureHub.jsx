import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import {
  infrastructureEvolution,
  infrastructureModules,
  infrastructureMvpCut,
} from '../../data/infrastructure-modules'

export default function InfrastructureHub() {
  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title="Infrastructure" />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
              <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">
                Global infrastructure company
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                The layer that makes Property Hub something people depend on daily.
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#4b5563] md:text-lg">
                These expansions move the platform beyond features into an operating system, network, financial layer,
                trust layer, AI intelligence engine, and developer ecosystem for real estate.
              </p>
            </div>

            <div className="rounded-lg border border-[#cbd3df] bg-[#071121] p-6 text-white shadow-sm md:p-8">
              <p className="text-sm font-semibold text-white/70">Reality check</p>
              <h3 className="mt-3 text-3xl font-black">Start small. Validate in Ghana. Expand slowly.</h3>
              <p className="mt-4 text-sm leading-6 text-white/70">
                The infrastructure roadmap is intentionally staged so the product can become global without collapsing
                under compliance, partner, and operational complexity.
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {infrastructureModules.map((module) => (
              <Link
                key={module.id}
                to={`/infrastructure/${module.id}`}
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
                  <span>{module.capabilities.length} capabilities</span>
                  <span className="material-symbols-outlined text-[#007a52]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
              <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">Final evolution</p>
              <h2 className="mt-2 text-3xl font-black">What this becomes</h2>
              <div className="mt-6 grid gap-3">
                {infrastructureEvolution.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-md bg-[#f8faff] p-4">
                    <span className="material-symbols-outlined text-[#007a52]">layers</span>
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
              <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">MVP cut</p>
              <h2 className="mt-2 text-3xl font-black">Build first, prove fast</h2>
              <div className="mt-6 grid gap-3">
                {infrastructureMvpCut.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-md bg-[#f8faff] p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e9fbf6] text-sm font-black text-[#007a52]">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
