import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { downloadCsv } from '../../lib/export-csv'
import { fetchPayroll, exportPayrollCsv, exportPayrollGhanaBank, runPayroll, syncPayrollFromCommissions } from '../../services/agency-service'

function Payroll() {
  const { t } = useTranslation()
  const [payroll, setPayroll] = useState([])
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPayroll().then(({ payroll: rows }) => setPayroll(rows))
  }, [])

  const total = payroll.reduce((sum, p) => sum + p.base + p.commission, 0)

  function handleExport() {
    const rows = exportPayrollCsv(payroll)
    downloadCsv(`baytmiftah-payroll-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  function handleExportGhana() {
    const rows = exportPayrollGhanaBank(payroll, { period: payroll[0]?.period })
    downloadCsv(`baytmiftah-payroll-ghana-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  async function handleRunPayroll() {
    setRunning(true)
    setMessage('')
    const pendingIds = payroll.filter((p) => p.status === 'pending').map((p) => p.id)
    const result = await runPayroll(pendingIds)
    setMessage(result.message || `Processed ${result.processed ?? 0} entries.`)
    if (result.processed) {
      setPayroll((prev) => prev.map((p) => (pendingIds.includes(p.id) ? { ...p, status: 'processing' } : p)))
    }
    setRunning(false)
  }

  async function handleSyncCommissions() {
    setRunning(true)
    setMessage('')
    const result = await syncPayrollFromCommissions(new Date().toISOString().slice(0, 7))
    setMessage(`Synced ${result.synced ?? 0} payroll rows from paid commissions.`)
    fetchPayroll().then(({ payroll: rows }) => setPayroll(rows))
    setRunning(false)
  }

  return (
    <AgencyShell titleKey="hubs.agency.payroll.title" subtitleKey="hubs.agency.payroll.subtitle">
      <p className="mb-6 text-2xl font-bold text-ink">
        GHS {total.toLocaleString()}{' '}
        <span className="text-base font-normal text-ink-secondary">{t('extensions.payroll.totalPeriod')}</span>
      </p>
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}
      <div className="overflow-hidden panel-card bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('extensions.payroll.name')}</th>
              <th className="px-4 py-3 font-semibold">{t('extensions.payroll.role')}</th>
              <th className="px-4 py-3 font-semibold">{t('extensions.payroll.base')}</th>
              <th className="px-4 py-3 font-semibold">{t('extensions.payroll.commission')}</th>
              <th className="px-4 py-3 font-semibold">{t('extensions.payroll.status')}</th>
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
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={handleSyncCommissions} disabled={running} className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
          Sync from commissions
        </button>
        <button type="button" onClick={handleRunPayroll} disabled={running} className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {running ? t('extensions.payroll.running') : t('extensions.payroll.run')}
        </button>
        <button type="button" onClick={handleExport} className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover">
          {t('extensions.payroll.exportCsv')}
        </button>
        <button type="button" onClick={handleExportGhana} className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover">
          {t('extensions.payroll.exportGhanaBank')}
        </button>
      </div>
    </AgencyShell>
  )
}

export default function AgencyPayrollPage() {
  return <ProtectedRoute><Payroll /></ProtectedRoute>
}
