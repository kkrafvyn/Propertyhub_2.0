import { useEffect } from 'react'
import { resolveRegionConfig } from '../services/platform-service'
import { getStoredRegionId } from '../lib/market-context'

/** Bootstrap region/plugin config on app load — API-first platform layer */
export default function MarketBootstrap({ children }) {
  useEffect(() => {
    resolveRegionConfig({ regionId: getStoredRegionId() }).catch(() => {})
  }, [])

  return children
}
