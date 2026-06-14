import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchWorkOrders } from '../../services/pms-service'

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([])
  const [vendors, setVendors] = useState([])

  useEffect(() => {
    fetchWorkOrders().then(({ workOrders: orders, vendors: v }) => {
      setWorkOrders(orders)
      setVendors(v)
    })
  }, [])

  return (
    <ManageShell titleKey="hubs.manage.workOrders.title" subtitleKey="hubs.manage.workOrders.subtitle">
      <div className="space-y-3">
        {workOrders.map((wo) => (
          <article key={wo.id} className="panel-card bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{wo.issue}</p>
                <p className="text-sm text-ink-secondary">{wo.unit} · {wo.vendor}</p>
              </div>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{wo.status.replace('_', ' ')}</span>
            </div>
            <p className="mt-2 text-sm">Est. cost: GHS {wo.cost.toLocaleString()} · {wo.created}</p>
          </article>
        ))}
      </div>

      <h3 className="mb-3 mt-8 font-semibold">Preferred vendors</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {vendors.map((v) => (
          <div key={v.id} className="panel-card bg-surface-subtle p-4">
            <p className="font-semibold">{v.name}</p>
            <p className="text-sm text-ink-secondary">{v.specialty}</p>
            <p className="mt-1 text-xs">★ {v.rating} · {v.jobs} jobs</p>
          </div>
        ))}
      </div>
    </ManageShell>
  )
}

export default function ManageWorkOrdersPage() {
  return <ProtectedRoute><WorkOrders /></ProtectedRoute>
}
