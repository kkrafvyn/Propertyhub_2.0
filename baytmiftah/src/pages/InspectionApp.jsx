import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { saveInspection } from '../services/frontier-service'

const defaultChecks = ['Exterior photos', 'Interior photos', 'Address geotag', 'Ownership document seen', 'Utilities checked', 'Owner signature']

export default function InspectionApp() {
  const [checks, setChecks] = useState(defaultChecks.map((label) => ({ label, done: false })))
  const [status, setStatus] = useState('')
  const score = Math.round((checks.filter((item) => item.done).length / checks.length) * 100)

  const submit = async () => {
    await saveInspection({
      checklist: checks,
      geotag: { source: 'browser-ready' },
      signature: { status: checks.at(-1)?.done ? 'captured' : 'pending' },
    })
    setStatus(`Inspection saved with score ${score}.`)
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Inspection App" />
        <div className="page-shell">
          <div className="content-shell grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className="panel">
              <h2 className="text-2xl font-semibold text-secondary">Field checklist</h2>
              <div className="mt-5 grid gap-3">
                {checks.map((item) => (
                  <label key={item.label} className="flex min-h-14 items-center justify-between rounded-md bg-surface p-4">
                    <span className="font-semibold">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() =>
                        setChecks((current) => current.map((check) => check.label === item.label ? { ...check, done: !check.done } : check))
                      }
                      className="h-5 w-5 accent-secondary"
                    />
                  </label>
                ))}
              </div>
            </section>
            <aside className="panel bg-[#111827] text-white">
              <p className="text-sm uppercase tracking-widest text-[#E9C349]">Inspection score</p>
              <p className="mt-3 text-5xl font-semibold">{score}</p>
              <button onClick={submit} className="mt-6 min-h-11 w-full rounded-md bg-[#E9C349] px-4 py-3 font-semibold text-[#111827]">
                Save report
              </button>
              {status && <p className="mt-4 text-sm text-white/70">{status}</p>}
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
