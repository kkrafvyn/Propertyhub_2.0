import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { revenueManagementService } from "../../../../lib/revenue-management.service";

export function TaxesSettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    default_currency: "GHS",
    default_country: "GH",
    vat_rate: "15",
    vat_enabled: true,
    nhil_rate: "2.5",
    getfund_rate: "2.5",
    tax_inclusive_pricing: false,
  });

  useEffect(() => {
    void revenueManagementService
      .getSettings()
      .then((rows) => {
        setSettings({
          default_currency: String(rows.default_currency || "GHS").replace(/"/g, ""),
          default_country: String(rows.default_country || "GH").replace(/"/g, ""),
          vat_rate: String(rows.vat_rate ?? "15"),
          vat_enabled: rows.vat_enabled === true || rows.vat_enabled === "true",
          nhil_rate: String(rows.nhil_rate ?? "2.5"),
          getfund_rate: String(rows.getfund_rate ?? "2.5"),
          tax_inclusive_pricing:
            rows.tax_inclusive_pricing === true || rows.tax_inclusive_pricing === "true",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await Promise.all([
        revenueManagementService.setSetting("default_currency", settings.default_currency, "Default platform currency"),
        revenueManagementService.setSetting("default_country", settings.default_country, "Default country code"),
        revenueManagementService.setSetting("vat_rate", Number(settings.vat_rate), "VAT percentage"),
        revenueManagementService.setSetting("vat_enabled", settings.vat_enabled, "Whether VAT is applied"),
        revenueManagementService.setSetting("nhil_rate", Number(settings.nhil_rate), "NHIL levy percentage"),
        revenueManagementService.setSetting("getfund_rate", Number(settings.getfund_rate), "GETFund levy percentage"),
        revenueManagementService.setSetting(
          "tax_inclusive_pricing",
          settings.tax_inclusive_pricing,
          "Whether displayed prices include tax",
        ),
      ]);
      toast.success("Tax and platform settings saved.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save tax settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading tax settings…</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Taxes & VAT</h2>
        <p className="text-muted-foreground mt-1">
          Configure default country, currency, and Ghana tax levies.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={settings.default_currency}
            onChange={(event) => setSettings({ ...settings, default_currency: event.target.value })}
            placeholder="Default currency"
          />
          <Input
            value={settings.default_country}
            onChange={(event) => setSettings({ ...settings, default_country: event.target.value })}
            placeholder="Default country"
          />
          <Input
            type="number"
            value={settings.vat_rate}
            onChange={(event) => setSettings({ ...settings, vat_rate: event.target.value })}
            placeholder="VAT rate %"
          />
          <Input
            type="number"
            value={settings.nhil_rate}
            onChange={(event) => setSettings({ ...settings, nhil_rate: event.target.value })}
            placeholder="NHIL rate %"
          />
          <Input
            type="number"
            value={settings.getfund_rate}
            onChange={(event) => setSettings({ ...settings, getfund_rate: event.target.value })}
            placeholder="GETFund rate %"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.vat_enabled}
            onChange={(event) => setSettings({ ...settings, vat_enabled: event.target.checked })}
          />
          VAT enabled on platform fees
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.tax_inclusive_pricing}
            onChange={(event) =>
              setSettings({ ...settings, tax_inclusive_pricing: event.target.checked })
            }
          />
          Display tax-inclusive prices
        </label>

        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save tax settings"}
        </Button>
      </Card>
    </div>
  );
}
