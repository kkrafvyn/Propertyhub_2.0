import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import VendorShell from '../../components/VendorShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { PanelCard, PrimaryButton } from '../../components/ui/AirbnbUI'
import {
  fetchVendorDashboard,
  fetchOpenWorkOrders,
  saveVendor,
  assignVendorToJob,
  updateVendorJobStatus,
} from '../../services/vendor-service'

function VendorHub() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchVendorDashboard().then(setData)
  }, [])

  return (
    <VendorShell title="Vendor portal" subtitle="Maintenance network and job dispatch">
      <div className="grid gap-4 sm:grid-cols-3">
        <PanelCard title="Your vendors">
          <p className="text-2xl font-bold">{data?.vendors?.length ?? 0}</p>
          <Link to="/vendors/directory" className="mt-2 inline-block text-sm font-semibold text-brand-accent underline">Manage directory</Link>
        </PanelCard>
        <PanelCard title="Assigned jobs">
          <p className="text-2xl font-bold">{data?.assignedJobs?.length ?? 0}</p>
          <Link to="/vendors/jobs" className="mt-2 inline-block text-sm font-semibold text-brand-accent underline">View jobs</Link>
        </PanelCard>
        <PanelCard title="Dispatch">
          <p className="text-sm text-ink-secondary">Assign open work orders to preferred vendors.</p>
          <PrimaryButton as={Link} to="/vendors/dispatch" className="mt-3">Open dispatch</PrimaryButton>
        </PanelCard>
      </div>
      {data?.vendorProfile && (
        <PanelCard title="Your vendor profile" className="mt-6">
          <p className="font-semibold">{data.vendorProfile.name}</p>
          <p className="text-sm text-ink-secondary">{data.vendorProfile.trade} · {data.vendorProfile.jobsCompleted} jobs completed</p>
        </PanelCard>
      )}
    </VendorShell>
  )
}

function VendorDirectory() {
  const [vendors, setVendors] = useState([])
  const [name, setName] = useState('')
  const [trade, setTrade] = useState('plumbing')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  function reload() {
    fetchVendorDashboard().then(({ vendors: rows }) => setVendors(rows ?? []))
  }

  useEffect(() => { reload() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    await saveVendor({ name, trade, phone })
    setName('')
    setPhone('')
    setMessage('Vendor saved.')
    reload()
  }

  return (
    <VendorShell title="Vendor directory" subtitle="Preferred contractors for your portfolio">
      <form onSubmit={handleAdd} className="mb-6 max-w-lg space-y-3 panel-card bg-surface-subtle p-5">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
        <select value={trade} onChange={(e) => setTrade(e.target.value)} className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm">
          {['plumbing', 'electrical', 'hvac', 'cleaning', 'general'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
        <PrimaryButton type="submit">Add vendor</PrimaryButton>
        {message && <p className="text-sm text-ink-secondary">{message}</p>}
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {vendors.map((v) => (
          <article key={v.id} className="panel-card bg-surface p-4">
            <p className="font-semibold">{v.name}</p>
            <p className="text-sm capitalize text-ink-secondary">{v.trade} · {v.jobsCompleted ?? 0} jobs</p>
            {v.phone && <p className="text-xs text-ink-secondary">{v.phone}</p>}
          </article>
        ))}
      </div>
    </VendorShell>
  )
}

function VendorJobs() {
  const [jobs, setJobs] = useState([])
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    fetchVendorDashboard().then(({ assignedJobs }) => setJobs(assignedJobs ?? []))
  }, [])

  async function markComplete(id) {
    setBusy(id)
    await updateVendorJobStatus(id, 'completed')
    fetchVendorDashboard().then(({ assignedJobs }) => setJobs(assignedJobs ?? []))
    setBusy(null)
  }

  return (
    <VendorShell title="My jobs" subtitle="Work orders assigned to you">
      {jobs.length === 0 ? (
        <p className="text-sm text-ink-secondary">No assigned jobs. Property managers dispatch work from the Dispatch tab.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <article key={j.id} className="panel-card bg-surface p-4">
              <p className="font-semibold">{j.issue}</p>
              <p className="text-sm text-ink-secondary">{j.unit} · {j.priority} · {j.status}</p>
              {j.status !== 'completed' && (
                <button type="button" disabled={busy === j.id} onClick={() => markComplete(j.id)} className="mt-2 rounded-lg bg-mobile-forest px-3 py-1.5 text-xs font-semibold text-white">
                  Mark completed
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </VendorShell>
  )
}

function VendorDispatch() {
  const [workOrders, setWorkOrders] = useState([])
  const [vendors, setVendors] = useState([])
  const [assignments, setAssignments] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchOpenWorkOrders().then(({ workOrders: wo, vendors: v }) => {
      setWorkOrders(wo ?? [])
      setVendors(v ?? [])
    })
  }, [])

  async function handleAssign(woId) {
    const vendorId = assignments[woId]
    if (!vendorId) return
    await assignVendorToJob(woId, vendorId)
    setMessage('Vendor assigned.')
    fetchOpenWorkOrders().then(({ workOrders: wo, vendors: v }) => {
      setWorkOrders(wo ?? [])
      setVendors(v ?? [])
    })
  }

  return (
    <VendorShell title="Dispatch" subtitle="Assign work orders to vendors">
      {message && <p className="mb-4 text-sm text-ink-secondary">{message}</p>}
      <div className="space-y-3">
        {workOrders.map((wo) => (
          <article key={wo.id} className="panel-card bg-surface p-4">
            <p className="font-semibold">{wo.issue}</p>
            <p className="text-sm text-ink-secondary">{wo.unit} · {wo.vendor ?? 'Unassigned'}</p>
            {wo.status === 'open' && vendors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  value={assignments[wo.id] ?? ''}
                  onChange={(e) => setAssignments((prev) => ({ ...prev, [wo.id]: e.target.value }))}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-sm"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => handleAssign(wo.id)} className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white">Assign</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </VendorShell>
  )
}

export function VendorHubPage() {
  return <ProtectedRoute><VendorHub /></ProtectedRoute>
}

export function VendorDirectoryPage() {
  return <ProtectedRoute><VendorDirectory /></ProtectedRoute>
}

export function VendorJobsPage() {
  return <ProtectedRoute><VendorJobs /></ProtectedRoute>
}

export function VendorDispatchPage() {
  return <ProtectedRoute><VendorDispatch /></ProtectedRoute>
}
