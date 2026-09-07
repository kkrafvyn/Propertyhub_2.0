import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { fraudDetectionService } from "../../../lib/fraud-detection.service";
import { useAuth } from "../../context/AuthContext";

export default function FraudDashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    void loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await fraudDetectionService.getFraudAlerts(filter);
      setAlerts(data);
    } catch (error) {
      console.error("Failed to load fraud alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (alertId: string) => {
    try {
      if (!user?.id) return;
      await fraudDetectionService.reviewAlert(alertId, true, user.id);
      await loadAlerts();
    } catch (error) {
      console.error("Failed to approve alert:", error);
    }
  };

  const handleReject = async (alertId: string) => {
    try {
      if (!user?.id) return;
      await fraudDetectionService.reviewAlert(alertId, false, user.id);
      await loadAlerts();
    } catch (error) {
      console.error("Failed to reject alert:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fraud Detection Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Review and manage fraud alerts</p>
      </div>

      <div className="flex gap-2">
        {["pending", "approved", "rejected", "resolved"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading fraud alerts...</Card>
        ) : alerts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No {filter} alerts found</Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 gap-3">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{alert.alert_type}</h3>
                      <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                      <Badge variant="outline">{alert.target_type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {filter === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleReject(alert.id)}
                      disabled={!user?.id}
                    >
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => void handleApprove(alert.id)} disabled={!user?.id}>
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
  );
}
