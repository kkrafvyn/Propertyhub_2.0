import React from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { getGlobalReadinessModule } from '../../data/global-readiness-modules'

export default function GlobalReadinessDetail() {
  const { moduleId } = useParams()
  const module = getGlobalReadinessModule(moduleId)

  if (!module) return <Navigate to="/global" replace />

  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title={module.title} showBack />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <span className="flex h-14 w-14 items-center justify-center rounded-md bg-[#e9fbf6] text-[#007a52]">
                  <span className="material-symbols-outlined text-3xl">{module.icon}</span>
                </span>
                <p className="mt-5 text-label-sm font-bold uppercase tracking-wider text-[#007a52]">
                  {module.status}
                </p>
                <h2 className="mt-2 text-4xl font-black md:text-5xl">{module.title}</h2>
                <p className="mt-4 text-lg leading-8 text-[#4b5563]">{module.summary}</p>
              </div>
              <Link to="/global" className="btn-secondary inline-flex items-center gap-2 self-start">
                <span className="material-symbols-outlined">public</span>
                Global layer
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">Controls to implement</h3>
              <div className="mt-5 grid gap-3">
                {module.capabilities.map((capability) => (
                  <div key={capability} className="flex items-start gap-3 rounded-md bg-[#f8faff] p-4">
                    <span className="material-symbols-outlined text-[#007a52]">check_circle</span>
                    <span className="font-semibold">{capability}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">Market examples</h3>
              <div className="mt-5 grid gap-3">
                {module.examples.map((example) => (
                  <div key={example} className="rounded-md border border-[#e5e7eb] p-4">
                    <p className="font-semibold">{example}</p>
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
