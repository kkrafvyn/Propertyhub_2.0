import { useCallback, useEffect, useState } from 'react'
import { isKycVerified } from '../lib/baytmiftah/kyc'
import { fetchMyKyc } from '../lib/baytmiftah/trust-service'

export function useMyKyc() {
  const [kyc, setKyc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const { kyc: record } = await fetchMyKyc()
      setKyc(record)
      return record
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    fetchMyKyc()
      .then(({ kyc: record }) => {
        if (!ignore) setKyc(record)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => { ignore = true }
  }, [])

  return { kyc, loading, verified: isKycVerified(kyc), refetch: reload }
}

