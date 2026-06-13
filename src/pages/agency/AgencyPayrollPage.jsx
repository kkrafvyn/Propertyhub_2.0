import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchPayroll } from '../../services/agency-service'

function Payroll() {
  const [payroll, setPayroll] = useState([])

  useEffect(() => {
    fetchPayroll().then(({ payroll: rows }) => setPayroll(rows))
  }, [])

  const total = payroll.reduce((sum, p) => sum + p.base + p.commission, 0)

  return (
    <AgencyShell title="Payroll & commissions" subtitle="Agent compensation and payout status">
      <p className="mb-6 text-2xl font-bold text-brand-dark">GHS {total.toLocaleString()} <span className="text-base font-normal text-ink-secondary">total this period</span></p>
      <div className="overflow-hidden rounded-card border border-surface-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Base</th>
              <th className="px-4 py-3 font-semibold">Commission</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payroll.map((p) => (
              <tr key={p.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-ink-secondary">{p.role}</td>
                <td className="px-4 py-3">GHS {p.base.toLocaleString()}</td>
                <td className="px-4 py-3">GHS {p.commission.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold capitalize text-brand-dark">{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-4 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
        Run payroll
      </button>
    </AgencyShell>
  )
}

export default function AgencyPayrollPage() {
  return <ProtectedRoute><Payroll /></ProtectedRoute>
}
