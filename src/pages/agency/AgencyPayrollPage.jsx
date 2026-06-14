import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { downloadCsv } from '../../lib/export-csv'
import { fetchPayroll, exportPayrollCsv } from '../../services/agency-service'

function Payroll() {
  const { t } = useTranslation()
  const [payroll, setPayroll] = useState([])

  useEffect(() => {
    fetchPayroll().then(({ payroll: rows }) => setPayroll(rows))
  }, [])

  const total = payroll.reduce((sum, p) => sum + p.base + p.commission, 0)

  function handleExport() {
    const rows = exportPayrollCsv(payroll)
    downloadCsv(`baytmiftah-payroll-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <AgencyShell titleKey="hubs.agency.payroll.title" subtitleKey="hubs.agency.payroll.subtitle">
      <p className="mb-6 text-2xl font-bold text-ink">
        GHS {total.toLocaleString()}{' '}
        <span className="text-base font-normal text-ink-secondary">{t('extensions.payroll.totalPeriod')}</span>
      </p>
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
      <div className="mt-4 flex gap-3">
        <button type="button" className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
          {t('extensions.payroll.run')}
        </button>
        <button type="button" onClick={handleExport} className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover">
          {t('extensions.payroll.exportCsv')}
        </button>
      </div>
    </AgencyShell>
  )
}

export default function AgencyPayrollPage() {
  return <ProtectedRoute><Payroll /></ProtectedRoute>
}
