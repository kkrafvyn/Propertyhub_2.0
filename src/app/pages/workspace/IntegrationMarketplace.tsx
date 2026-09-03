import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plug, CheckCircle2, ExternalLink } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { integrationMarketplaceService, type IntegrationCatalogWithStatus } from "../../../lib/integration-marketplace.service";

export function IntegrationMarketplace({ organizationId }: { organizationId: string }) {
  const [items, setItems] = useState<IntegrationCatalogWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const load = async () => {
    try {
      setLoading(true);
      const rows = await integrationMarketplaceService.getCatalogWithStatus(organizationId);
      setItems(rows);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  const categories: string[] = ["all", ...Array.from(new Set(items.map((i) => i.category)))];

  const filtered = category === "all" ? items : items.filter((i) => i.category === category);

  const handleConnect = async (slug: string) => {
    try {
      await integrationMarketplaceService.connectIntegration(organizationId, slug);
      toast.success("Integration connected — add API credentials in Settings when ready.");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDisconnect = async (slug: string) => {
    try {
      await integrationMarketplaceService.disconnectIntegration(organizationId, slug);
      toast.success("Integration disconnected");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Plug className="h-6 w-6" /> Integration Marketplace</h1>
        <p className="text-sm text-muted-foreground">Connect screening, accounting, syndication, payments, and communications partners.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-muted-foreground">Loading catalog...</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.slug} className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <Badge variant="outline" className="mt-1 capitalize">{item.category}</Badge>
                </div>
                {item.orgStatus === "connected" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              </div>
              <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
              <p className="text-xs text-muted-foreground">Regions: {item.supported_regions.join(", ")}</p>
              <div className="flex gap-2">
                {item.orgStatus === "connected" ? (
                  <Button size="sm" variant="outline" onClick={() => handleDisconnect(item.slug)}>Disconnect</Button>
                ) : (
                  <Button size="sm" onClick={() => handleConnect(item.slug)}>
                    {item.requires_credentials ? "Connect" : "Enable"}
                  </Button>
                )}
                {item.provider_website && (
                  <a
                    href={item.provider_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
