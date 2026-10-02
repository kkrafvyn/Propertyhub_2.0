import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { GitBranch, Loader2, Plus, Save, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import type { MemberRole } from "../../../lib/workspace";
import { approvalChainService } from "../../../lib/approval-chain.service";
import {
  APPROVAL_CHAIN_DOMAINS,
  APPROVAL_STEP_ROLE_OPTIONS,
  type ApprovalChainDomain,
  type ApprovalChainStep,
  type OrganizationApprovalChain,
} from "../../../lib/approval-chain.types";
import { getWorkspaceRoute } from "../../../lib/workspace";

interface WorkflowApprovalHubProps {
  organizationId: string;
  organizationSlug: string;
  currentRole: MemberRole | null;
}

function emptyChain(domain: ApprovalChainDomain): Omit<OrganizationApprovalChain, "id" | "created_at" | "updated_at"> {
  return {
    organization_id: "",
    domain,
    name: `${APPROVAL_CHAIN_DOMAINS.find((d) => d.id === domain)?.label || "Custom"} approval`,
    description: null,
    enabled: true,
    steps: [
      { order: 1, label: "Submit request", role: "property_manager" },
      { order: 2, label: "Supervisor review", role: "supervisor" },
      { order: 3, label: "Final approval", role: "owner" },
    ],
  };
}

export function WorkflowApprovalHub({
  organizationId,
  organizationSlug,
  currentRole,
}: WorkflowApprovalHubProps) {
  const canManage =
    currentRole === "owner" || currentRole === "manager" || currentRole === "organization_admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chains, setChains] = useState<OrganizationApprovalChain[]>([]);
  const [draft, setDraft] = useState<OrganizationApprovalChain | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setChains(await approvalChainService.list(organizationId));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load approval chains.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const startNew = (domain: ApprovalChainDomain) => {
    setDraft({
      ...emptyChain(domain),
      id: "",
      organization_id: organizationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const updateStep = (index: number, patch: Partial<ApprovalChainStep>) => {
    if (!draft) return;
    const steps = draft.steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
    setDraft({ ...draft, steps });
  };

  const saveDraft = async () => {
    if (!draft || !canManage) return;
    try {
      setSaving(true);
      await approvalChainService.upsert({
        id: draft.id || undefined,
        organizationId,
        domain: draft.domain,
        name: draft.name,
        description: draft.description,
        steps: draft.steps,
        enabled: draft.enabled,
      });
      toast.success("Approval chain saved.");
      setDraft(null);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save approval chain.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex min-h-[240px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Approval Chains</h1>
        </div>
        <Link to={getWorkspaceRoute(organizationSlug, "workflows")}>
          <Button variant="outline">
            <Workflow className="mr-2 h-4 w-4" />
            Open Workflow Builder
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Approval chains</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {APPROVAL_CHAIN_DOMAINS.map((domain) => (
            <Button key={domain.id} size="sm" variant="outline" disabled={!canManage} onClick={() => startNew(domain.id)}>
              <Plus className="mr-2 h-4 w-4" />
              {domain.label}
            </Button>
          ))}
        </div>

        {chains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approval chains configured yet.</p>
        ) : (
          <div className="space-y-3">
            {chains.map((chain) => (
              <div key={chain.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      <p className="font-semibold">{chain.name}</p>
                      <Badge variant="outline">{chain.domain}</Badge>
                      {!chain.enabled ? <Badge variant="secondary">Disabled</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {chain.description || APPROVAL_CHAIN_DOMAINS.find((d) => d.id === chain.domain)?.description}
                    </p>
                    <ol className="mt-3 space-y-1 text-sm">
                      {chain.steps.map((step) => (
                        <li key={`${chain.id}-${step.order}`}>
                          {step.order}. {step.label}
                          {step.role ? ` · ${step.role.replace(/_/g, " ")}` : ""}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!canManage} onClick={() => setDraft(chain)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canManage}
                      onClick={async () => {
                        await approvalChainService.remove(chain.id);
                        await load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {draft ? (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{draft.id ? "Edit approval chain" : "New approval chain"}</h3>
          <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input
            label="Description"
            value={draft.description || ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium">Steps</p>
            {draft.steps.map((step, index) => (
              <div key={step.order} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                <Input
                  label={`Step ${step.order} label`}
                  value={step.label}
                  onChange={(e) => updateStep(index, { label: e.target.value })}
                />
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Approver role</span>
                  <NativeSelectControl
                    className="app-input w-full"
                    value={step.role || ""}
                    onChange={(e) => updateStep(index, { role: e.target.value || null })}
                  >
                    <option value="">Any eligible approver</option>
                    {APPROVAL_STEP_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role.replace(/_/g, " ")}
                      </option>
                    ))}
                  </NativeSelectControl>
                </label>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void saveDraft()} disabled={saving || !canManage}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save chain
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
