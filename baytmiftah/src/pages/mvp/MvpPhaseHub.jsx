import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { mvpPhaseModules, mvpPhaseSequence } from '../../data/mvp-phase-modules'
import { complianceService, monetizationService } from '../../services/mvp-service'

export default function MvpPhaseHub() {
  const [baseline, setBaseline] = useState(null)
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState('Loading launch gates...')

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      complianceService.getGhanaBaseline(),
      monetizationService.getPlans('agency'),
    ]).then(([baselineResult, plansResult]) => {
      if (!mounted) return
      if (baselineResult.status === 'fulfilled') setBaseline(baselineResult.value)
      if (plansResult.status === 'fulfilled') setPlans(plansResult.value || [])
      setStatus('Edge Function contracts are connected')
    })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title="MVP Control" />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <p className="text-label-sm font-bold uppercase tracking-wider text-[#E9C349]">
              Pre-deploy phase 1 to 4
            </p>
            <div className="mt-3 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h2 className="max-w-4xl text-4xl font-black leading-tight md:text-5xl">
                  Ghana compliance, trust review, agency CRM, and monetization are now launch gates.
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-[#4b5563] md:text-lg">
                  This workspace tracks the first four backend-ready additions before deployment. Each gate has a
                  Supabase schema, an Edge Function, and a frontend service entry point.
                </p>
              </div>

              <div className="rounded-lg bg-[#071121] p-6 text-white">
                <p className="text-sm text-white/70">{status}</p>
                <p className="mt-2 text-5xl font-black">{mvpPhaseModules.length}</p>
                <p className="mt-4 text-sm leading-6 text-white/70">
                  New Edge Functions: compliance, trust, agency-crm, and monetization.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-[#E9C349]">description</span>
              <p className="mt-3 text-sm text-[#4b5563]">Ghana required docs</p>
              <p className="mt-1 text-3xl font-black">
                {(baseline?.saleDocuments?.length || 0) + (baseline?.rentDocuments?.length || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-[#E9C349]">workspace_premium</span>
              <p className="mt-3 text-sm text-[#4b5563]">Agency plans</p>
              <p className="mt-1 text-3xl font-black">{plans.length}</p>
            </div>
            <div className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-[#E9C349]">api</span>
              <p className="mt-3 text-sm text-[#4b5563]">Edge Functions</p>
              <p className="mt-1 text-3xl font-black">4</p>
            </div>
            <div className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-[#E9C349]">database</span>
              <p className="mt-3 text-sm text-[#4b5563]">Schema tables</p>
              <p className="mt-1 text-3xl font-black">9</p>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {mvpPhaseModules.map((module) => (
              <Link
                key={module.id}
                to={`/mvp/${module.id}`}
                className="rounded-lg border border-[#cbd3df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#E9C349] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#fff7d6] text-[#E9C349]">
                    <span className="material-symbols-outlined">{module.icon}</span>
                  </span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-xs font-bold text-[#303744]">
                    {module.status}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black">{module.title}</h3>
                <p className="mt-2 min-h-[96px] text-sm leading-6 text-[#4b5563]">{module.summary}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#e5e7eb] pt-4 text-sm font-bold">
                  <span>{module.functionName}</span>
                  <span className="material-symbols-outlined text-[#E9C349]">arrow_forward</span>
                </div>
              </Link>
            ))}
          </section>

          <section className="mt-8 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-wider text-[#E9C349]">Deployment sequence</p>
                <h2 className="mt-2 text-3xl font-black">What happens before deploy</h2>
              </div>
              <Link to="/mvp/ghana-compliance" className="btn-secondary inline-flex items-center gap-2">
                <span className="material-symbols-outlined">policy</span>
                Start with compliance
              </Link>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-5">
              {mvpPhaseSequence.map((step, index) => (
                <div key={step} className="rounded-md bg-[#f8faff] p-4">
                  <span className="text-sm font-black text-[#E9C349]">Step {index + 1}</span>
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
