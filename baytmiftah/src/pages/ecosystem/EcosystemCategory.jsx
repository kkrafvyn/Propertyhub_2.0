import React from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { getEcosystemModule } from '../../data/ecosystem-modules'

export default function EcosystemCategory() {
  const { categoryId } = useParams()
  const group = getEcosystemModule(categoryId)

  if (!group) return <Navigate to="/ecosystem" replace />

  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title={group.title} showBack />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: group.color }}
                >
                  <span className="material-symbols-outlined text-3xl">{group.icon}</span>
                </span>
                <p className="mt-5 text-label-sm font-bold uppercase tracking-wider text-[#E9C349]">
                  {group.status}
                </p>
                <h2 className="mt-2 text-4xl font-black md:text-5xl">{group.title}</h2>
                <p className="mt-4 text-lg leading-8 text-[#4b5563]">{group.summary}</p>
              </div>
              <Link to="/ecosystem" className="btn-secondary inline-flex items-center gap-2 self-start">
                <span className="material-symbols-outlined">apps</span>
                All modules
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            {group.modules.map((module) => (
              <article key={module.name} className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black">{module.name}</h3>
                    <p className="mt-3 leading-7 text-[#4b5563]">{module.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-[#E9C349]">add_task</span>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-black uppercase tracking-wider text-[#303744]">Core features</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {module.features.map((feature) => (
                      <span key={feature} className="rounded-full bg-[#fff7d6] px-3 py-1 text-sm font-semibold text-[#E9C349]">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-black uppercase tracking-wider text-[#303744]">Primary users</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {module.users.map((user) => (
                      <span key={user} className="rounded-full bg-[#edf4ff] px-3 py-1 text-sm font-semibold text-[#303744]">
                        {user.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
