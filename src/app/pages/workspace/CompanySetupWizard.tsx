import { useEffect, useState } from "react";
import { Building2, CheckCircle2, CreditCard, Database, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "../../../lib/database.types";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { organizationService } from "../../../lib/organization.service";
import {
  CAPABILITY_DEFINITIONS,
  COMPANY_TYPE_DEFINITIONS,
  type CompanyBusinessType,
  type CompanyCapability,
  getRecommendedDepartments,
  resolveCapabilitiesFromBusinessTypes,
} from "../../../lib/company-model";

type Organization = Database["public"]["Tables"]["organizations"]["Row"] & {
  business_types?: string[] | null;
  enabled_capabilities?: string[] | null;
  company_setup_completed?: boolean | null;
};

interface CompanySetupWizardProps {
  organization: Organization;
  onComplete: () => void;
}

const TEAM_SIZE_OPTIONS = [
  { id: "solo", label: "Just me", max: 1 },
  { id: "small", label: "2–10 people", max: 10 },
  { id: "medium", label: "11–50 people", max: 50 },
  { id: "large", label: "51–200 people", max: 200 },
  { id: "enterprise", label: "200+", max: 9999 },
] as const;

const WORKFLOW_PRESETS = [
  { id: "leasing", label: "Leasing & tenant onboarding" },
  { id: "maintenance", label: "Maintenance & work orders" },
  { id: "collections", label: "Rent collections" },
  { id: "sales", label: "Sales & CRM pipeline" },
] as const;

export function CompanySetupWizard({ organization, onComplete }: CompanySetupWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<CompanyBusinessType[]>(["property_management"]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<CompanyCapability[]>(
    resolveCapabilitiesFromBusinessTypes(["property_management"]),
  );
  const [teamSize, setTeamSize] = useState<(typeof TEAM_SIZE_OPTIONS)[number]["id"]>("small");
  const [propertyCount, setPropertyCount] = useState("");
  const [regionName, setRegionName] = useState("");
  const [createRegion, setCreateRegion] = useState(true);
  const [workflows, setWorkflows] = useState<string[]>(["leasing", "maintenance"]);
  const [planImportLater, setPlanImportLater] = useState(true);
  const [planPaymentsLater, setPlanPaymentsLater] = useState(true);

  const recommendedDepartments = getRecommendedDepartments(selectedCapabilities);

  const toggleType = (type: CompanyBusinessType) => {
    setSelectedTypes((current) => {
      const next = current.includes(type)
        ? current.filter((entry) => entry !== type)
        : [...current, type];
      const resolved = resolveCapabilitiesFromBusinessTypes(next.length ? next : [type]);
      setSelectedCapabilities(resolved);
      return next.length ? next : [type];
    });
  };

  const toggleCapability = (capability: CompanyCapability) => {
    setSelectedCapabilities((current) =>
      current.includes(capability)
        ? current.filter((entry) => entry !== capability)
        : [...current, capability],
    );
  };

  const toggleWorkflow = (id: string) => {
    setWorkflows((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const finishSetup = async () => {
    if (!selectedTypes.length) {
      toast.error("Select at least one company type.");
      return;
    }

    try {
      setSubmitting(true);
      await organizationService.completeCompanySetup({
        organizationId: organization.id,
        businessTypes: selectedTypes,
        enabledCapabilities: selectedCapabilities,
        departments: recommendedDepartments.map((department) => ({
          department_key: department.key,
          name: department.label,
        })),
        setupMetadata: {
          team_size: teamSize,
          estimated_properties: propertyCount ? Number(propertyCount) : null,
          workflow_templates: workflows,
          import_planned: planImportLater,
          payments_connect_planned: planPaymentsLater,
          completed_at: new Date().toISOString(),
        },
        initialUnits:
          createRegion && regionName.trim()
            ? [{ name: regionName.trim(), unitType: "region", code: null }]
            : [],
      });
      toast.success("Company profile saved. Your workspace is tailored to your business.");
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error("We couldn't save your company profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [
    "Company type",
    "Capabilities",
    "Team size",
    "Structure",
    "Integrations",
    "Team",
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-sm font-medium text-primary">Company setup</p>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
          Tell BaytMiftah what {organization.name} does
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          We recommend departments, modules, and workflows — you stay in control.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        {stepLabels.map((label, index) => (
          <span key={label} className={step >= index + 1 ? "font-semibold text-primary" : ""}>
            {index + 1}. {label}
            {index < stepLabels.length - 1 ? " →" : ""}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">What does your company do?</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {COMPANY_TYPE_DEFINITIONS.map((type) => {
              const active = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleType(type.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-surface-border bg-surface-subtle hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{type.label}</p>
                      <p className="mt-1 text-xs text-ink-secondary">{type.description}</p>
                    </div>
                    {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Enabled capabilities</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(CAPABILITY_DEFINITIONS) as CompanyCapability[]).map((capability) => {
              const definition = CAPABILITY_DEFINITIONS[capability];
              const active = selectedCapabilities.includes(capability);
              return (
                <button
                  key={capability}
                  type="button"
                  onClick={() => toggleCapability(capability)}
                  className={`rounded-xl border p-4 text-left transition ${
                    active ? "border-primary bg-primary/5" : "border-surface-border opacity-70"
                  }`}
                >
                  <p className="font-medium text-ink">{definition.label}</p>
                  <p className="mt-1 text-xs text-ink-secondary">{definition.description}</p>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">How big is your team?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEAM_SIZE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTeamSize(option.id)}
                className={`rounded-lg border px-4 py-3 text-left text-sm ${
                  teamSize === option.id ? "border-primary bg-primary/5" : "border-surface-border"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Input
            label="Approximate properties or projects (optional)"
            value={propertyCount}
            onChange={(event) => setPropertyCount(event.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 120"
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Organization structure</h2>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createRegion}
              onChange={(event) => setCreateRegion(event.target.checked)}
            />
            Create a first region or portfolio now
          </label>
          {createRegion ? (
            <Input
              value={regionName}
              onChange={(event) => setRegionName(event.target.value)}
              placeholder="e.g. Accra Portfolio"
            />
          ) : null}
          <p className="text-xs text-ink-secondary">
            Recommended departments: {recommendedDepartments.map((d) => d.label).join(" · ")}
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={() => setStep(5)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Workflows & integrations</h2>
          </div>
          <div className="space-y-2">
            {WORKFLOW_PRESETS.map((preset) => (
              <label key={preset.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={workflows.includes(preset.id)}
                  onChange={() => toggleWorkflow(preset.id)}
                />
                {preset.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={planImportLater}
              onChange={(event) => setPlanImportLater(event.target.checked)}
            />
            Import existing data later (Data Import module)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4" />
            <input
              type="checkbox"
              checked={planPaymentsLater}
              onChange={(event) => setPlanPaymentsLater(event.target.checked)}
            />
            Connect payments later (Settings → Integrations)
          </label>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
            <Button onClick={() => setStep(6)}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Invite your team</h2>
          </div>
          <p className="text-sm text-ink-secondary">
            You are the organization owner. After setup, open Team to invite employees, assign job
            roles, set property scope, and configure approval limits.
          </p>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(5)}>Back</Button>
            <Button onClick={() => void finishSetup()} disabled={submitting}>
              {submitting ? "Saving..." : "Finish setup & open Team"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
