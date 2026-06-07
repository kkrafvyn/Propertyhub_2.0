import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { ecosystemModules, standoutFeatures } from '../../data/ecosystem-modules'

const totals = ecosystemModules.reduce(
  (acc, group) => {
    acc.categories += 1
    acc.products += group.modules.length
    return acc
  },
  { categories: 0, products: 0 }
)

export default function EcosystemHub() {
  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title="Ecosystem" />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
              <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">
                Property Hub OS
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
                A complete operating system for property discovery, ownership, development, and operations.
              </h2>
              <p className="mt-5 max-w-2xl text-base text-[#4b5563] md:text-lg">
                These modules turn the app from a listing marketplace into a full property ecosystem across finance,
                construction, maintenance, AI, legal, relocation, community, commercial, analytics, and smart buildings.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border border-[#cbd3df] bg-[#071121] p-6 text-white shadow-sm">
                <p className="text-sm text-white/70">Ecosystem categories</p>
                <p className="mt-2 text-5xl font-black">{totals.categories}</p>
              </div>
              <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#4b5563]">Product modules</p>
                <p className="mt-2 text-5xl font-black text-[#007a52]">{totals.products}</p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ecosystemModules.map((group) => (
              <Link
                key={group.id}
                to={`/ecosystem/${group.id}`}
                className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#007a52] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: group.color }}
                  >
                    <span className="material-symbols-outlined">{group.icon}</span>
                  </span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-xs font-bold text-[#303744]">
                    {group.status}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black">{group.title}</h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#4b5563]">{group.summary}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#e5e7eb] pt-4 text-sm font-bold">
                  <span>{group.modules.length} modules</span>
                  <span className="material-symbols-outlined text-[#007a52]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </section>

          <section className="mt-8 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">Standout bets</p>
                <h2 className="mt-2 text-3xl font-black">What makes Property Hub hard to copy</h2>
              </div>
              <Link to="/ecosystem/ai-suite" className="btn-secondary inline-flex items-center gap-2">
                <span className="material-symbols-outlined">auto_awesome</span>
                AI Suite
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {standoutFeatures.map((feature, index) => (
                <div key={feature} className="flex items-center gap-3 rounded-md bg-[#f8faff] p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e9fbf6] text-sm font-black text-[#007a52]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold">{feature}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
