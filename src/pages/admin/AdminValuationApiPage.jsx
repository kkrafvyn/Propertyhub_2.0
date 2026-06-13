import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchValuationApiDocs } from '../../services/trust-service'

function ValuationApi() {
  const [docs, setDocs] = useState(null)

  useEffect(() => {
    fetchValuationApiDocs().then(({ docs: d }) => setDocs(d))
  }, [])

  if (!docs) return null

  return (
    <AdminShell title="Valuation API" subtitle="Data product for institutional integrations">
      <div className="space-y-4 rounded-card border border-white/10 bg-white/5 p-5 font-mono text-sm">
        <div>
          <p className="text-white/50">Endpoint</p>
          <p className="text-brand">{docs.endpoint}</p>
        </div>
        <div>
          <p className="text-white/50">Method</p>
          <p>{docs.method}</p>
        </div>
        <div>
          <p className="text-white/50">Sample request</p>
          <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-3 text-xs">{JSON.stringify(docs.sampleRequest, null, 2)}</pre>
        </div>
        <div>
          <p className="text-white/50">Sample response</p>
          <pre className="mt-1 overflow-x-auto rounded bg-black/30 p-3 text-xs">{JSON.stringify(docs.sampleResponse, null, 2)}</pre>
        </div>
      </div>
      <p className="mt-4 text-sm text-white/70">Requires authenticated Bearer token. Rate limits apply per API key tier.</p>
    </AdminShell>
  )
}

export default function AdminValuationApiPage() {
  return <ProtectedRoute><ValuationApi /></ProtectedRoute>
}
