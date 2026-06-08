import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, DataBanner, LoadingState } from '../../components/UI'
import { fieldAgentService } from '../../services/product-feature-service'

export default function MobileAgentApp() {
  const [tasks, setTasks] = useState([])
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fieldAgentService.listTasks().then((result) => {
      setTasks(result.tasks)
      setSource(result.source)
      setLoading(false)
    })
  }, [])

  return (
    <main className="min-h-screen bg-[#F5F7FA] pb-8">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Field workspace</p>
            <h1 className="text-2xl font-semibold text-[#101828]">Today</h1>
          </div>
          <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-md bg-[#101828] text-white" aria-label="Open main app">
            <span className="material-symbols-outlined">home</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-5">
        <DataBanner
          className="mb-5"
          variant={source === 'supabase' ? 'info' : 'warning'}
          title="Mobile-first agent flow"
          description="Capture media, verify access, and complete viewing tasks from a phone-sized workspace."
        />

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#101828]">Field tasks</h2>
            <Badge variant={source === 'supabase' ? 'success' : 'warning'}>{source || 'loading'}</Badge>
          </div>
          {loading ? (
            <LoadingState className="mt-4" title="Loading tasks" />
          ) : (
            <div className="mt-4 grid gap-3">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-lg border border-black/10 bg-[#F9FAFB] p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined flex h-11 w-11 items-center justify-center rounded-md bg-[#E9C349] text-[#101828]">
                      {task.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#101828]">{task.title}</p>
                      <p className="mt-1 text-sm text-[#667085]">{task.property}</p>
                    </div>
                    <Badge variant={task.status === 'ready' ? 'success' : 'warning'}>{task.status}</Badge>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          {[
            ['photo_camera', 'Media'],
            ['badge', 'ID check'],
            ['signature', 'Signature'],
            ['sync_alt', 'Sync'],
          ].map(([icon, label]) => (
            <button key={label} className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-black/10 bg-white text-[#101828]">
              <span className="material-symbols-outlined text-3xl">{icon}</span>
              <span className="mt-2 text-sm font-semibold">{label}</span>
            </button>
          ))}
        </section>
      </div>
    </main>
  )
}
