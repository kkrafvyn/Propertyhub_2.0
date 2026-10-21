import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  OperationalQueryState,
  WorkspacePageShell,
} from "../../components/ux";

const db = supabase as any;

const FILTER_OPTIONS = ["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;

export function LeasingApplications({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await db
        .from("public_lease_applications")
        .select("*, properties(title, address)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load lease applications";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const handleUpdateStatus = async (
    id: string,
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
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
      void fetchApplications();
      setSelectedApp(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    }
  };

  const filtered = useMemo(
    () =>
      applications.filter((a) => {
        if (filter === "ALL") return true;
        return a.status === filter;
      }),
    [applications, filter],
  );

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : applications.length === 0
        ? "empty"
        : filtered.length === 0
          ? "filtered-empty"
          : "ready";

  return (
    <WorkspacePageShell
      title="Leasing applications & screening"
      description="Incoming public rental applications, background screening, and approval routing."
      actions={
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((s) => (
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
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void fetchApplications()}
        emptyTitle="No rental applications yet"
        emptyDescription="Public lease applications will appear here when applicants submit through your listing links."
        filteredEmptyTitle="No applications match this filter"
        filteredEmptyDescription="Try another status filter or wait for new submissions."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="space-y-3">
                {filtered.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedApp(app);
                      }
                    }}
                    role="button"
                    tabIndex={0}
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
                      <span className="font-mono">{app.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            {selectedApp ? (
              <Card className="p-6 space-y-5">
                <div className="border-b border-surface-border pb-3">
                  <h3 className="font-bold text-ink text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Application dossier
                  </h3>
                  <p className="text-xs text-ink-muted">ID: {selectedApp.id?.slice(0, 8)}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-muted">Applicant</div>
                    <div className="font-semibold text-ink">{selectedApp.applicant_name}</div>
                    <div className="text-xs text-ink-muted">
                      {selectedApp.applicant_email} | {selectedApp.applicant_phone}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-ink-muted">Monthly income</div>
                    <div className="font-semibold text-ink font-mono">
                      GH₵ {selectedApp.monthly_income || "Not specified"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-ink-muted">Employment / employer</div>
                    <div className="text-ink">
                      {selectedApp.employer || "Self-employed / private"}
                    </div>
                  </div>

                  {selectedApp.notes ? (
                    <div>
                      <div className="text-xs text-ink-muted">Applicant note</div>
                      <div className="p-2.5 bg-surface-subtle rounded-lg text-xs text-ink">
                        {selectedApp.notes}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 pt-3 border-t border-surface-border">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleUpdateStatus(selectedApp.id, "APPROVED")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Approve application
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-rose-600 hover:bg-rose-50"
                    onClick={() => handleUpdateStatus(selectedApp.id, "REJECTED")}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject application
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
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
