import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileSignature,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Ban,
  FileText,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  eSignatureService,
  type EsigRequest,
  type DocumentType,
} from "../../../lib/esignature.service";
import { useAuth } from "../../context/AuthContext";
import { leaseService } from "../../../lib/lease.service";
import { leaseEsignReminderService } from "../../../lib/lease-esign-reminder.service";
import {
  leaseEsignatureService,
  prepareLeaseEnvelope,
} from "../../../lib/lease-esignature.service";
import { LEASE_TEMPLATE_PRESETS } from "../../../lib/lease-template.service";

export function ESignature({
  organizationId,
}: {
  organizationId?: string;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"list" | "create">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<EsigRequest[]>([]);

  // Form State
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<DocumentType>("lease_agreement");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("14");
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [templateId, setTemplateId] = useState("residential_standard");
  const [clausePreview, setClausePreview] = useState("");
  const [auditScore, setAuditScore] = useState<number | null>(null);
  const [forceOverride, setForceOverride] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const list = await eSignatureService.listRequests(organizationId);
      setRequests(list);
    } catch (err: any) {
      toast.error(err.message || "Failed to load eSignature requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    if (!organizationId) return;
    void leaseService.getOrganizationLeases(organizationId).then(setLeases).catch(() => setLeases([]));
  }, [organizationId]);

  useEffect(() => {
    if (docType !== "lease_agreement" || !selectedLeaseId) {
      setClausePreview("");
      return;
    }
    const lease = leases.find((entry) => entry.id === selectedLeaseId);
    if (!lease) return;
    const prepared = prepareLeaseEnvelope({
      organizationId: organizationId!,
      lease,
      templateId,
    });
    setDocName(prepared.documentName);
    setClausePreview(prepared.documentBody);
    setAuditScore(prepared.auditScore);
    if (lease.tenant?.full_name) setSignerName(lease.tenant.full_name);
    if (lease.tenant?.email) setSignerEmail(lease.tenant.email);
  }, [docType, selectedLeaseId, templateId, leases, organizationId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      setSaving(true);
      if (docType === "lease_agreement" && selectedLeaseId) {
        const lease = leases.find((entry) => entry.id === selectedLeaseId);
        if (lease) {
          await leaseEsignatureService.sendLeaseForSigning({
            organizationId,
            lease,
            requestedBy: user?.id,
            templateId,
            expiresInDays: parseInt(expiresInDays) || 14,
            forceOverride,
          });
          toast.success("Lease envelope sent with jurisdiction clauses");
          setSelectedLeaseId("");
          setClausePreview("");
          setTab("list");
          loadRequests();
          return;
        }
      }

      await eSignatureService.createRequest({
        organizationId,
        documentName: docName,
        documentType: docType,
        documentBody: clausePreview || undefined,
        signerName,
        signerEmail,
        signerPhone: signerPhone || undefined,
        expiresInDays: parseInt(expiresInDays) || 14,
        requestedBy: user?.id,
      });

      toast.success("eSignature envelope sent to recipient");
      setDocName("");
      setSignerName("");
      setSignerEmail("");
      setSignerPhone("");
      setTab("list");
      loadRequests();
    } catch (err: any) {
      if (
        err?.name === "CounselSignoffRequiredError" &&
        window.confirm(`${err.message}\n\nSend with manager override?`)
      ) {
        setForceOverride(true);
        try {
          if (docType === "lease_agreement" && selectedLeaseId) {
            const lease = leases.find((entry) => entry.id === selectedLeaseId);
            if (lease) {
              await leaseEsignatureService.sendLeaseForSigning({
                organizationId,
                lease,
                requestedBy: user?.id,
                templateId,
                expiresInDays: parseInt(expiresInDays) || 14,
                forceOverride: true,
              });
              toast.success("Lease envelope sent with manager override");
              setSelectedLeaseId("");
              setClausePreview("");
              setTab("list");
              loadRequests();
              return;
            }
          }
        } catch (retryErr: any) {
          toast.error(retryErr.message || "Failed to send eSignature request");
        } finally {
          setSaving(false);
        }
        return;
      }
      toast.error(err.message || "Failed to send eSignature request");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSigned = async (id: string) => {
    try {
      await eSignatureService.markSigned(id);
      await eSignatureService.completeRequest(id);
      toast.success("Document marked as signed and executed");
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to update request");
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      setRemindingId(id);
      await leaseEsignReminderService.sendReminder(id, user?.id);
      toast.success("Signing reminder sent (email, SMS if phone on file)");
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder");
    } finally {
      setRemindingId(null);
    }
  };

  const handleVoid = async (id: string) => {
    const reason = window.prompt("Reason for voiding envelope:");
    if (!reason) return;
    try {
      await eSignatureService.voidRequest(id, reason);
      toast.success("Envelope voided");
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to void request");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            eSignature & Digital Contracts
          </h1>
          <p className="text-sm text-ink-muted">
            Send, track, and execute legally binding leases, addendums, and offer letters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={tab === "list" ? "primary" : "outline"}
            onClick={() => setTab("list")}
            size="sm"
          >
            <FileSignature className="w-4 h-4 mr-1.5" />
            Envelopes List
          </Button>
          <Button
            variant={tab === "create" ? "primary" : "outline"}
            onClick={() => setTab("create")}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Send New Document
          </Button>
        </div>
      </div>

      {tab === "list" && (
        <Card className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-ink-muted">
              Loading eSignature envelopes...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileSignature className="w-10 h-10 mx-auto text-ink-muted opacity-40" />
              <p className="text-ink-muted">No signature requests found.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTab("create")}
              >
                Send your first contract
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-surface-border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase text-ink-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Signer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-hover/50">
                      <td className="px-4 py-3 font-medium text-ink">
                        {r.document_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-ink font-semibold">
                          {(r.signers?.[0]?.name) || "—"}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {(r.signers?.[0]?.email) || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase font-mono text-ink-muted">
                        {r.document_type?.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            r.status === "completed" || r.status === "signed"
                              ? "bg-emerald-500/10 text-emerald-600 border-none"
                              : r.status === "voided"
                              ? "bg-rose-500/10 text-rose-600 border-none"
                              : "bg-blue-500/10 text-blue-600 border-none"
                          }
                        >
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted font-mono">
                        {r.expires_at ? r.expires_at.slice(0, 10) : "14 days"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {r.signing_url && r.status === "sent" && (
                          <a
                            href={r.signing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-primary font-semibold hover:underline mr-2"
                          >
                            Sign Link
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                        {["sent", "viewed", "partially_signed"].includes(r.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={remindingId === r.id}
                            onClick={() => void handleSendReminder(r.id)}
                            className="text-amber-600 hover:bg-amber-50"
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Remind
                          </Button>
                        )}
                        {r.status === "sent" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkSigned(r.id)}
                            className="text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Simulate Sign
                          </Button>
                        )}
                        {r.status === "sent" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVoid(r.id)}
                            className="text-rose-600 hover:bg-rose-50"
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />
                            Void
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "create" && (
        <Card className="p-6 max-w-2xl mx-auto space-y-5">
          <div className="border-b border-surface-border pb-3">
            <h2 className="text-lg font-bold text-ink">Send for eSignature</h2>
            <p className="text-xs text-ink-muted">
              Creates a legally binding envelope delivered to the recipient for digital execution.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Document Title *
              </label>
              <Input
                required
                placeholder="e.g. Standard Residential Lease — Unit 14B"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Document Type
                </label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-ink text-sm"
                  value={docType}
                  onChange={(e) =>
                    setDocType(e.target.value as DocumentType)
                  }
                >
                  <option value="lease_agreement">Lease Agreement</option>
                  <option value="offer_letter">Offer Letter</option>
                  <option value="purchase_agreement">Purchase Agreement</option>
                  <option value="addendum">Lease Addendum</option>
                  <option value="custom">Custom Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Validity Window (Days)
                </label>
                <Input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
            </div>

            {docType === "lease_agreement" && leases.length > 0 ? (
              <div className="space-y-3 rounded-xl border border-surface-border p-4 bg-surface-subtle">
                <h3 className="text-sm font-bold text-ink">Auto-clauses from property jurisdiction</h3>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-ink text-sm"
                  value={selectedLeaseId}
                  onChange={(e) => setSelectedLeaseId(e.target.value)}
                >
                  <option value="">Manual document (no lease link)</option>
                  {leases.map((lease) => (
                    <option key={lease.id} value={lease.id}>
                      {lease.listing?.property?.address || "Property"} — {lease.tenant?.full_name || "Tenant"}
                    </option>
                  ))}
                </select>
                {selectedLeaseId ? (
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface text-ink text-sm"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    {LEASE_TEMPLATE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {clausePreview ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">Preview generated clauses</summary>
                    {auditScore != null ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Compliance score: {auditScore}/100
                        {auditScore < 50 ? " — below minimum; enable manager override to send." : ""}
                      </p>
                    ) : null}
                    <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-surface p-3 whitespace-pre-wrap font-mono text-[11px]">
                      {clausePreview.slice(0, 2400)}
                      {clausePreview.length > 2400 ? "\n…" : ""}
                    </pre>
                  </details>
                ) : null}
                {selectedLeaseId && auditScore != null && auditScore < 50 ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={forceOverride}
                      onChange={(e) => setForceOverride(e.target.checked)}
                    />
                    Manager override — send despite low compliance score
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="border-t border-surface-border pt-4">
              <h3 className="text-sm font-bold text-ink mb-3">
                Recipient / Signer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Signer Full Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Kofi Mensah"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="kofi.mensah@gmail.com"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1">
                      Mobile Number (Optional)
                    </label>
                    <Input
                      placeholder="+233 24 123 4567"
                      value={signerPhone}
                      onChange={(e) => setSignerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTab("list")}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                <Send className="w-4 h-4 mr-1.5" />
                {saving ? "Sending Envelope..." : "Send for Signature"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
