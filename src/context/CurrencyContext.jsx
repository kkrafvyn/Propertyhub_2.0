import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CurrencyContext = createContext({ currency: 'GHS', setCurrency: () => {}, formatPrice: (n) => `GHS ${n}` })

const RATES = { GHS: 1, USD: 1 / 15.5 }

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      return localStorage.getItem('baytmiftah_currency') || 'GHS'
    } catch {
      return 'GHS'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('baytmiftah_currency', currency)
    } catch { /* ignore */ }
  }, [currency])

  const value = useMemo(() => ({
    currency,
    setCurrency: setCurrencyState,
    formatPrice(amount, opts = {}) {
      const n = Number(amount) || 0
      if (currency === 'USD') {
        const usd = n * RATES.USD
        return opts.perMonth ? `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} / mo` : `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      }
      return opts.perMonth ? `GHS ${n.toLocaleString()} / month` : `GHS ${n.toLocaleString()}`
    },
  }), [currency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
