import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import { addDeveloperProject, getDeveloperLaunchSnapshot } from '../services/frontier-service'

export default function DeveloperLaunchRoom() {
  const [projects, setProjects] = useState(getDeveloperLaunchSnapshot)
  const [name, setName] = useState('')

  const addProject = (event) => {
    event.preventDefault()
    addDeveloperProject({
      name,
      launchStatus: 'planning',
      waitlistCount: 0,
      constructionProgress: 0,
      reservationDeposit: 50000,
    })
    setProjects(getDeveloperLaunchSnapshot())
    setName('')
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Developer Launch Room" />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <form onSubmit={addProject} className="panel-compact flex flex-col gap-3 sm:flex-row">
              <input className="input-field flex-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" required />
              <button className="btn-primary">Add project</button>
            </form>
            <section className="grid gap-4 lg:grid-cols-3">
              {projects.map((project) => (
                <article key={project.id} className="panel">
                  <p className="text-sm font-bold uppercase tracking-widest text-secondary">{project.launchStatus}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{project.name}</h2>
                  <div className="mt-5 grid gap-3 text-sm text-on-surface-variant">
                    <p>Waitlist: {project.waitlistCount}</p>
                    <p>Construction: {project.constructionProgress}%</p>
                    <p>Reservation deposit: GHS {project.reservationDeposit}</p>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
