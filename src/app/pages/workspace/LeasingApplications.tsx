import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const db = supabase as any;

export function LeasingApplications({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const fetchApplications = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const { data, error } = await db
        .from("public_lease_applications")
        .select("*, properties(title, address)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load lease applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [organizationId]);

  const handleUpdateStatus = async (
    id: string,
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW"
  ) => {
    try {
      const { error } = await db
        .from("public_lease_applications")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Application marked as ${status}`);
      fetchApplications();
      setSelectedApp(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const filtered = applications.filter((a) => {
    if (filter === "ALL") return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Leasing Applications & Screening
          </h1>
          <p className="text-sm text-ink-muted">
            Incoming public rental applications, background screening, and approval routing.
          </p>
        </div>
        <div className="flex gap-2">
          {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((s) => (
            <Button
              key={s}
              variant={filter === s ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter(s)}
              className="text-xs"
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            {loading ? (
              <div className="py-12 text-center text-ink-muted">
                Loading applications...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-ink-muted">
                No rental applications match the current filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedApp?.id === app.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-surface-border hover:border-ink-muted/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-ink">
                          {app.applicant_name || "Anonymous Applicant"}
                        </div>
                        <div className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                          <span>{app.applicant_email}</span>
                          <span>•</span>
                          <span>{app.applicant_phone}</span>
                        </div>
                      </div>
                      <Badge
                        className={
                          app.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 border-none"
                            : app.status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-600 border-none"
                            : "bg-amber-500/10 text-amber-600 border-none"
                        }
                      >
                        {app.status || "PENDING"}
                      </Badge>
                    </div>

                    <div className="mt-3 text-xs flex justify-between items-center text-ink-muted border-t border-surface-border/50 pt-2">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {app.properties?.title || "Property Reference"}
                      </span>
                      <span className="font-mono">
                        {app.created_at?.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          {selectedApp ? (
            <Card className="p-6 space-y-5">
              <div className="border-b border-surface-border pb-3">
                <h3 className="font-bold text-ink text-base">
                  Application Dossier
                </h3>
                <p className="text-xs text-ink-muted">
                  ID: {selectedApp.id?.slice(0, 8)}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-ink-muted">Applicant</div>
                  <div className="font-semibold text-ink">
                    {selectedApp.applicant_name}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {selectedApp.applicant_email} | {selectedApp.applicant_phone}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-ink-muted">Monthly Income</div>
                  <div className="font-semibold text-ink font-mono">
                    GH₵ {selectedApp.monthly_income || "Not specified"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-ink-muted">Employment / Employer</div>
                  <div className="text-ink">
                    {selectedApp.employer || "Self-Employed / Private"}
                  </div>
                </div>

                {selectedApp.notes && (
                  <div>
                    <div className="text-xs text-ink-muted">Applicant Note</div>
                    <div className="p-2.5 bg-surface-subtle rounded-lg text-xs text-ink">
                      {selectedApp.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-surface-border">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleUpdateStatus(selectedApp.id, "APPROVED")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve Application
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-rose-600 hover:bg-rose-50"
                  onClick={() => handleUpdateStatus(selectedApp.id, "REJECTED")}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject Application
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-ink-muted text-sm space-y-2">
              <UserCheck className="w-8 h-8 mx-auto opacity-40" />
              <p>Select an application from the list to review screening details.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
