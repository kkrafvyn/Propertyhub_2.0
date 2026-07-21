import { useEffect, useState } from 'react'
import { isKycVerified } from '../lib/baytmiftah/kyc'
import { fetchMyKyc } from '../lib/baytmiftah/trust-service'

export function useMyKyc() {
  const [kyc, setKyc] = useState(null)
  const [loading, setLoading] = useState(true)

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

  return { kyc, loading, verified: isKycVerified(kyc) }
}
