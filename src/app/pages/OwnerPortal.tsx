import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Building2, Loader2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
import { stakeholderPortalService, type OwnerPortalSnapshot } from "../../lib/stakeholder-portal.service";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";

export function OwnerPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<OwnerPortalSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const data = await stakeholderPortalService.getOwnerPortalSnapshot(token);
        setSnapshot(data);
      } catch (err: any) {
        setError(err.message || "Portal access denied");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const estate = snapshot?.estate as { name?: string; city?: string; region?: string; currency?: string } | null;
  const units = snapshot?.units || [];

  return (
    <StandalonePageShell title="Owner Portal">
      <div className="mx-auto max-w-3xl py-8 px-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading portal...</div>
        ) : error ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">{error}</p></Card>
        ) : snapshot ? (
          <>
            <div>
              <Badge variant="outline" className="mb-2 capitalize">{snapshot.portal_type} portal</Badge>
              <h1 className="text-2xl font-bold">Welcome, {snapshot.contact_name}</h1>
              <p className="text-sm text-muted-foreground">{snapshot.contact_email}</p>
            </div>

            {estate && (
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div>
                    <h2 className="font-semibold text-lg">{estate.name}</h2>
                    <p className="text-sm text-muted-foreground">{[estate.city, estate.region].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="font-semibold mb-4">Portfolio units ({units.length})</h2>
              {units.length === 0 ? (
                <p className="text-sm text-muted-foreground">No units linked to this portal yet.</p>
              ) : (
                <div className="space-y-2">
                  {units.map((unit: any) => (
                    <div key={unit.id} className="rounded-lg border p-3 flex justify-between">
                      <span className="font-medium">{unit.identifier || unit.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="capitalize">{unit.status?.replace(/_/g, " ") || "active"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <p className="text-xs text-center text-muted-foreground">Powered by BaytMiftah · Branded owner portal</p>
          </>
        ) : null}
      </div>
    </StandalonePageShell>
  );
}
