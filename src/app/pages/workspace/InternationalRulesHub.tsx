import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Globe, MapPin, Receipt, CreditCard, Scale, Save } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import {
  listCountryPacks,
  calculateCountryTaxes,
  getAvailablePaymentRails,
  SUBDIVISION_OPTIONS,
  SUBDIVISION_ENABLED_JURISDICTIONS,
  getSubdivisionOverlay,
  type CountryCode,
} from "../../../lib/country-rules";
import { jurisdictionCounselSignoffService } from "../../../lib/jurisdiction-counsel-signoff.service";
import { countryRulesService } from "../../../lib/country-rules.service";
import { getJurisdictionRules } from "../../../lib/real-estate-compliance";
import { getSubdivisionClauseAddendum } from "../../../lib/country-rules/subdivision-clause-addenda";
import { countAvailableAddenda } from "../../../lib/country-rules/subdivision-addenda-auto";
import { useAuth } from "../../context/AuthContext";

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100);

export function InternationalRulesHub({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const packs = useMemo(() => listCountryPacks(), []);
  const [selected, setSelected] = useState<CountryCode>("GH");
  const [subdivision, setSubdivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [counselSignoffs, setCounselSignoffs] = useState<any[]>([]);
  const [counselName, setCounselName] = useState("");
  const [counselFirm, setCounselFirm] = useState("");
  const [counselNotes, setCounselNotes] = useState("");
  const [recordingCounsel, setRecordingCounsel] = useState(false);

  const context = useMemo(
    () => countryRulesService.resolveContext({
      organizationJurisdiction: selected,
      subdivisionCode: subdivision || undefined,
    }),
    [selected, subdivision]
  );

  const compliance = useMemo(() => getJurisdictionRules(selected), [selected]);
  const sampleTax = useMemo(
    () => calculateCountryTaxes(context, [{ category: "rent", amountMinor: 500000 }]),
    [context]
  );
  const subdivisionOptions = SUBDIVISION_OPTIONS[selected] ?? [];
  const subdivisionOverlay = getSubdivisionOverlay(selected, subdivision);
  const subdivisionLabel = subdivisionOptions.find((o) => o.code === subdivision)?.label;

  const rails = useMemo(() => getAvailablePaymentRails(context, "rent"), [context]);

  useEffect(() => {
    void countryRulesService.getOrganizationSettings(organizationId).then(setOrgSettings);
    void jurisdictionCounselSignoffService.list(organizationId).then(setCounselSignoffs);
  }, [organizationId]);

  useEffect(() => {
    if (!SUBDIVISION_ENABLED_JURISDICTIONS.includes(selected)) {
      setSubdivision("");
      return;
    }
    const valid = SUBDIVISION_OPTIONS[selected]?.some((o) => o.code === subdivision);
    if (subdivision && !valid) setSubdivision("");
  }, [selected, subdivision]);

  useEffect(() => {
    if (orgSettings?.default_jurisdiction) setSelected(orgSettings.default_jurisdiction);
    if (orgSettings?.default_subdivision) setSubdivision(orgSettings.default_subdivision);
  }, [orgSettings]);

  const activeCounselSignoff = counselSignoffs.find(
    (row) =>
      row.jurisdiction_id === selected &&
      (row.subdivision_code || "") === (subdivision || "")
  );
  const activeAddendum = getSubdivisionClauseAddendum(selected, subdivision || undefined);

  const handleCounselSignoff = async () => {
    if (!user?.id || !counselName.trim()) {
      toast.error("Enter counsel name to record sign-off.");
      return;
    }
    try {
      setRecordingCounsel(true);
      await jurisdictionCounselSignoffService.recordSignoff({
        organizationId,
        jurisdictionId: selected,
        subdivisionCode: subdivision || null,
        counselName: counselName.trim(),
        counselFirm: counselFirm.trim() || undefined,
        notes: counselNotes.trim() || undefined,
        signedOffBy: user.id,
      });
      setCounselSignoffs(await jurisdictionCounselSignoffService.list(organizationId));
      toast.success("Counsel sign-off recorded for lease templates.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecordingCounsel(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await countryRulesService.upsertOrganizationSettings({
        organizationId,
        defaultJurisdiction: selected,
        defaultSubdivision: subdivision || undefined,
        defaultCurrency: context.currency,
        enabledJurisdictions: [selected],
      });
      toast.success(`Operating market set to ${context.pack.label}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6" /> International Markets & Rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure your operating country — taxes, lease rules, and compliance follow local regulations.
          <strong className="font-medium text-foreground"> PayAngels</strong> is the worldwide payment rail for all markets.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Primary operating market</h2>
        <div className="flex flex-wrap gap-2">
          {packs.map((p) => (
            <Button
              key={p.jurisdictionId}
              size="sm"
              variant={selected === p.jurisdictionId ? "default" : "outline"}
              onClick={() => setSelected(p.jurisdictionId)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {subdivisionOptions.length > 0 && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm text-muted-foreground">
              {{
                US: "US state",
                EU: "EU member state",
                AE: "Emirate",
                CA: "Province",
                AU: "State / territory",
                NG: "State",
                IN: "State",
                GH: "Region",
                KE: "County",
                ZA: "Province",
                GB: "Nation",
              }[selected] || "Region"}
            </label>
            <select
              className="rounded-lg border px-3 py-2 text-sm max-w-xs"
              value={subdivision}
              onChange={(e) => setSubdivision(e.target.value)}
            >
              <option value="">National default</option>
              {subdivisionOptions.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
            {subdivisionOverlay && (
              <Badge variant="outline" className="w-fit">{subdivisionLabel} overlay active</Badge>
            )}
          </div>
        )}
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> Save as organization default
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Scale className="h-4 w-4" /> Compliance — {context.pack.label}{subdivisionLabel ? ` · ${subdivisionLabel}` : ""}</h2>
          <p className="text-sm text-muted-foreground">{compliance.dataProtectionLaw}</p>
          <p className="text-sm"><span className="font-medium">Regulator:</span> {compliance.realEstateRegulator}</p>
          <p className="text-sm"><span className="font-medium">Governing law:</span> {compliance.governingLaw}</p>
          <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
            {compliance.listingDisclosures.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Tax profile</h2>
          {context.effectiveTaxProfile.length === 0 ? (
            <p className="text-sm text-muted-foreground">No automated tax components — consult local advisor.</p>
          ) : context.effectiveTaxProfile.map((t) => (
            <div key={t.id} className="flex justify-between text-sm">
              <span>{t.label}{t.authority ? ` (${t.authority})` : ""}</span>
              <Badge variant="outline">{(t.rateBasisPoints / 100).toFixed(2)}%</Badge>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            Sample on GHS/USD {money(500000, context.currency).replace(/[\d.,]+/, "5,000")} rent:
            tax {money(sampleTax.totalTaxMinor, context.currency)}
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment rails</h2>
          <p className="text-xs text-muted-foreground">PayAngels handles checkout worldwide in local currency. Supplementary rails are optional.</p>
          {rails.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.currencies.join(", ")} · {r.purposes.join(", ")}</p>
            </div>
          ))}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Lease rules{subdivisionLabel ? ` — ${subdivisionLabel}` : ""}</h2>
          <div className="text-sm space-y-1">
            {context.pack.leaseRules.maxAdvanceRentMonths != null && (
              <p>Max advance rent: {context.pack.leaseRules.maxAdvanceRentMonths} months</p>
            )}
            {context.pack.leaseRules.maxSecurityDepositMonths != null && (
              <p>Max security deposit: {context.pack.leaseRules.maxSecurityDepositMonths} months</p>
            )}
            {context.pack.leaseRules.rentControlApplies && <Badge variant="outline">Rent control may apply</Badge>}
          </div>
          <ul className="text-xs list-disc pl-5 text-muted-foreground">
            {context.pack.leaseRules.statutoryReferences.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div className="flex flex-wrap gap-1 pt-2">
            {context.pack.enabledModules.map((m) => (
              <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Scale className="h-4 w-4" /> Counsel sign-off — lease templates
        </h2>
        <p className="text-sm text-muted-foreground">
          Record local counsel approval before sending jurisdiction-generated lease envelopes.
          {countAvailableAddenda()} subdivision addenda available ({activeAddendum ? "curated + auto" : "auto-generated fallback"}).
        </p>
        {activeCounselSignoff ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="font-medium text-emerald-800">
              Signed off by {activeCounselSignoff.counsel_name}
              {activeCounselSignoff.counsel_firm ? ` · ${activeCounselSignoff.counsel_firm}` : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selected}{subdivision ? ` · ${subdivision}` : ""} · v{activeCounselSignoff.template_version} ·{" "}
              {new Date(activeCounselSignoff.signed_off_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Counsel name"
              value={counselName}
              onChange={(e) => setCounselName(e.target.value)}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              placeholder="Law firm (optional)"
              value={counselFirm}
              onChange={(e) => setCounselFirm(e.target.value)}
            />
            <Button onClick={() => void handleCounselSignoff()} disabled={recordingCounsel}>
              Record counsel sign-off
            </Button>
          </div>
        )}
        {activeAddendum ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-ink">
              Preview addendum: {activeAddendum.title}
            </summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {activeAddendum.clauses.slice(0, 4).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </Card>
    </div>
  );
}
