import React, { useEffect, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/Button'
import { fraudDetectionService } from '@/lib/fraud-detection.service'
import { useAuth } from '@/app/context/AuthContext'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function FraudDashboard() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    loadAlerts()
  }, [filter])

  const loadAlerts = async () => {
    try {
      const data = await fraudDetectionService.getFraudAlerts(filter)
      setAlerts(data)
    } catch (error) {
      console.error('Failed to load fraud alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (alertId: string) => {
    try {
      if (!user?.id) return
      await fraudDetectionService.reviewAlert(alertId, true, user.id)
      await loadAlerts()
    } catch (error) {
      console.error('Failed to approve alert:', error)
    }
  }

  const handleReject = async (alertId: string) => {
    try {
      if (!user?.id) return
      await fraudDetectionService.reviewAlert(alertId, false, user.id)
      await loadAlerts()
    } catch (error) {
      console.error('Failed to reject alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'secondary'
      case 'medium': return 'outline'
      default: return 'secondary'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default: return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fraud Detection Dashboard</h1>
        <p className="text-muted-foreground mt-2">Review and manage fraud alerts</p>
      </div>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'resolved'].map(s => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">
            Loading fraud alerts...
          </Card>
        ) : alerts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No {filter} alerts found
          </Card>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{alert.alert_type}</h3>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.target_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {filter === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(alert.id)}
                      disabled={!user?.id}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(alert.id)}
                      disabled={!user?.id}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
