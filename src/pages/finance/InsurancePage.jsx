import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchInsuranceProducts } from '../../services/finance-service'
import { requestInsuranceQuote } from '../../services/insurance-service'

function Insurance() {
  const { t } = useTranslation()
  const [products, setProducts] = useState([])
  const [quoteProduct, setQuoteProduct] = useState(null)
  const [propertyValue, setPropertyValue] = useState('500000')
  const [coverageType, setCoverageType] = useState('building')
  const [loading, setLoading] = useState(false)
  const [quoteResult, setQuoteResult] = useState(null)

  useEffect(() => {
    fetchInsuranceProducts().then(({ products: rows }) => setProducts(rows))
  }, [])

  async function handleQuote() {
    if (!quoteProduct) return
    setLoading(true)
    const result = await requestInsuranceQuote({
      productId: quoteProduct.id,
      propertyValue,
      coverageType,
    })
    setQuoteResult(result)
    setLoading(false)
  }

  return (
    <FinanceShell titleKey="hubs.finance.insurance.title" subtitleKey="hubs.finance.insurance.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <article key={p.id} className="panel-card bg-surface p-5">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm text-ink-secondary">{p.provider}</p>
            <p className="mt-2 font-bold text-ink">{p.premium}</p>
            <p className="mt-2 text-sm text-ink-secondary">{p.coverage}</p>
            <button
              type="button"
              onClick={() => { setQuoteProduct(p); setQuoteResult(null) }}
              className="mt-4 rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold hover:bg-surface-subtle"
            >
              {t('extensions.insurance.getQuote')}
            </button>
          </article>
        ))}
      </div>

      {quoteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold">{t('extensions.insurance.quoteTitle', { name: quoteProduct.name })}</h3>
            <label className="mt-4 block text-sm font-semibold">{t('extensions.insurance.propertyValue')}</label>
            <input type="number" value={propertyValue} onChange={(e) => setPropertyValue(e.target.value)} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
            <label className="mt-3 block text-sm font-semibold">{t('extensions.insurance.coverageType')}</label>
            <select value={coverageType} onChange={(e) => setCoverageType(e.target.value)} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm">
              <option value="building">{t('extensions.insurance.building')}</option>
              <option value="contents">{t('extensions.insurance.contents')}</option>
              <option value="combined">{t('extensions.insurance.combined')}</option>
            </select>
            {quoteResult?.quote && (
              <p className="mt-4 rounded-lg bg-surface-subtle px-4 py-3 text-sm">
                {t('extensions.insurance.estimatedPremium')}: GHS {Number(quoteResult.quote.premium_estimate || quoteResult.quote.premiumEstimate).toLocaleString()}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setQuoteProduct(null)} className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold">{t('common.close')}</button>
              <button type="button" onClick={handleQuote} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {loading ? t('extensions.insurance.requesting') : t('extensions.insurance.requestQuote')}
              </button>
            </div>
          </div>
        </div>
      )}
    </FinanceShell>
  )
}

export default function InsurancePage() {
  return <ProtectedRoute><Insurance /></ProtectedRoute>
}
