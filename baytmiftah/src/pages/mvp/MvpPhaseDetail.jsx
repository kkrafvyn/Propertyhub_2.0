import React from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { getMvpPhaseModule } from '../../data/mvp-phase-modules'

export default function MvpPhaseDetail() {
  const { moduleId } = useParams()
  const module = getMvpPhaseModule(moduleId)

  if (!module) return <Navigate to="/mvp" replace />

  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title={module.title} showBack />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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
              <Link to="/mvp" className="btn-secondary inline-flex items-center gap-2 self-start">
                <span className="material-symbols-outlined">fact_check</span>
                MVP control
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">Implemented controls</h3>
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
              <h3 className="text-2xl font-black">Operational metrics</h3>
              <div className="mt-5 grid gap-3">
                {module.metrics.map((metric) => (
                  <div key={metric} className="rounded-md border border-[#e5e7eb] p-4">
                    <p className="font-semibold">{metric}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-wider text-[#007a52]">Build artifacts</p>
                <h3 className="mt-2 text-2xl font-black">Files added for this gate</h3>
              </div>
              <span className="rounded-full bg-[#edf4ff] px-4 py-2 text-sm font-bold text-[#303744]">
                Edge Function: {module.functionName}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {module.readyFiles.map((file) => (
                <div key={file} className="rounded-md bg-[#f8faff] p-4 font-mono text-sm">
                  {file}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
