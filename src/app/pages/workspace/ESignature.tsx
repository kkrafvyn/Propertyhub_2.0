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
  }, [organizationId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    try {
      setSaving(true);
      await eSignatureService.createRequest({
        organizationId,
        documentName: docName,
        documentType: docType,
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
                          {r.signer_name}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {r.signer_email}
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
