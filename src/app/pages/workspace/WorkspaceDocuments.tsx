import { useEffect, useMemo, useState } from "react";
import { FileSignature, Globe, History, PenSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/textarea";
import type { Database } from "../../../lib/database.types";
import { dealCaseService } from "../../../lib/dealcase.service";
import { documentCenterService } from "../../../lib/document-center.service";
import { paymentService } from "../../../lib/payment.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceDocumentsProps {
  organization: Organization;
  currentUserId: string;
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelative(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amountMinor || 0) / 100);
}

export function WorkspaceDocuments({
  organization,
  currentUserId,
}: WorkspaceDocumentsProps) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signDialogDocument, setSignDialogDocument] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [sourceDocument, setSourceDocument] = useState<any | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    documentType: "agreement",
    dealCaseId: "",
    transactionId: "",
    publicVisibility: false,
    signatureRequired: true,
    externalSignerName: "",
    externalSignerEmail: "",
    publicSummary: "",
    contentMarkdown: "",
  });
  const [signDraft, setSignDraft] = useState({
    signerName: "",
    signerEmail: "",
    signerRole: "organization_representative",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [documentRows, caseRows, paymentRows] = await Promise.all([
        documentCenterService.getOrganizationDocuments(organization.id),
        dealCaseService.getDealCasesByOrganization(organization.id),
        paymentService.getOrganizationPropertyTransactions(organization.id),
      ]);
      setDocuments(documentRows || []);
      setDealCases(caseRows || []);
      setPayments(paymentRows || []);
    } catch (error) {
      console.error("Failed to load document center:", error);
      toast.error("We couldn't load the document center right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id]);

  const groupedDocuments = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const document of documents) {
      const key = document.document_family_id || document.id;
      const current = groups.get(key) || [];
      current.push(document);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([familyId, versions]) => ({
      familyId,
      versions: [...versions].sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0)),
    }));
  }, [documents]);

  const metrics = useMemo(() => {
    const signed = documents.filter((document) => document.status === "signed").length;
    const publicDocs = documents.filter((document) => document.public_visibility).length;
    const contracts = documents.filter((document) =>
      ["lease_contract", "sale_contract", "agreement"].includes(document.document_type)
    ).length;

    return {
      total: groupedDocuments.length,
      signed,
      publicDocs,
      contracts,
    };
  }, [documents, groupedDocuments.length]);

  const resetDraft = () => {
    setDraft({
      title: "",
      documentType: "agreement",
      dealCaseId: "",
      transactionId: "",
      publicVisibility: false,
      signatureRequired: true,
      externalSignerName: "",
      externalSignerEmail: "",
      publicSummary: "",
      contentMarkdown: "",
    });
    setSourceDocument(null);
  };

  const handleGenerateTemplate = () => {
    const selectedCase = dealCases.find((item) => item.id === draft.dealCaseId) || null;
    const selectedPayment = payments.find((item) => item.id === draft.transactionId) || null;

    const title =
      draft.title ||
      `${formatLabel(draft.documentType)} - ${
        selectedCase?.user?.full_name || selectedPayment?.payer?.full_name || "Client"
      }`;

    const template = documentCenterService.buildDefaultTemplate({
      title,
      organizationName: organization.name,
      leadName: selectedCase?.user?.full_name || selectedPayment?.payer?.full_name || null,
      propertyAddress:
        selectedCase?.listing?.property?.address ||
        selectedPayment?.listing?.property?.address ||
        null,
      amountFormatted: selectedPayment
        ? formatMoney(selectedPayment.amount_minor, selectedPayment.currency || "GHS")
        : null,
      documentType: draft.documentType,
    });

    setDraft((current) => ({
      ...current,
      title,
      contentMarkdown: template,
      publicSummary:
        current.publicSummary ||
        "Public trust summary ready for listing-facing verification panels.",
    }));
  };

  const handleSaveDocument = async () => {
    if (!draft.title.trim() || !draft.contentMarkdown.trim()) {
      toast.error("Add a title and document content before saving.");
      return;
    }

    try {
      setSaving(true);
      const linkedCase = dealCases.find((item) => item.id === draft.dealCaseId) || null;
      const linkedPayment = payments.find((item) => item.id === draft.transactionId) || null;

      if (sourceDocument) {
        await documentCenterService.createNewVersion(sourceDocument, {
          createdBy: currentUserId,
          title: draft.title,
          publicSummary: draft.publicSummary,
          contentMarkdown: draft.contentMarkdown,
        });
      } else {
        await documentCenterService.createDocument({
          organizationId: organization.id,
          createdBy: currentUserId,
          title: draft.title,
          documentType: draft.documentType,
          dealCaseId: draft.dealCaseId || null,
          listingId:
            linkedCase?.listing_id ||
            linkedPayment?.listing_id ||
            null,
          transactionId: draft.transactionId || null,
          contentMarkdown: draft.contentMarkdown,
          publicVisibility: draft.publicVisibility,
          signatureRequired: draft.signatureRequired,
          externalSignerName: draft.externalSignerName || null,
          externalSignerEmail: draft.externalSignerEmail || null,
          publicSummary: draft.publicSummary || null,
        });
      }

      toast.success(sourceDocument ? "New document version saved." : "Document created.");
      setDialogOpen(false);
      resetDraft();
      await loadData();
    } catch (error) {
      console.error("Failed to save document:", error);
      toast.error("We couldn't save that document.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenVersionDialog = (document: any) => {
    setSourceDocument(document);
    setDraft({
      title: document.title,
      documentType: document.document_type,
      dealCaseId: document.deal_case_id || "",
      transactionId: document.transaction_id || "",
      publicVisibility: Boolean(document.public_visibility),
      signatureRequired: Boolean(document.signature_required),
      externalSignerName: document.external_signer_name || "",
      externalSignerEmail: document.external_signer_email || "",
      publicSummary: document.public_summary || "",
      contentMarkdown: document.content_markdown || "",
    });
    setDialogOpen(true);
  };

  const handleSignDocument = async () => {
    if (!signDialogDocument || !signDraft.signerName.trim()) {
      toast.error("Add the signer name before completing the signature.");
      return;
    }

    try {
      setSaving(true);
      await documentCenterService.signDocument({
        documentId: signDialogDocument.id,
        signerUserId: currentUserId,
        signerName: signDraft.signerName.trim(),
        signerEmail: signDraft.signerEmail.trim() || null,
        signerRole: signDraft.signerRole,
      });
      toast.success("Document signed.");
      setSignDialogDocument(null);
      setSignDraft({
        signerName: "",
        signerEmail: "",
        signerRole: "organization_representative",
      });
      await loadData();
    } catch (error) {
      console.error("Failed to sign document:", error);
      toast.error("We couldn't sign that document.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async (document: any) => {
    try {
      await documentCenterService.updateDocumentVisibility(document.id, !document.public_visibility);
      toast.success(document.public_visibility ? "Removed from public trust view." : "Added to public trust view.");
      await loadData();
    } catch (error) {
      console.error("Failed to update public visibility:", error);
      toast.error("We couldn't update the trust visibility.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Document Center</h1>
          <p className="text-muted-foreground mt-2">
            Keep agreements, offer letters, signed copies, and version history tied to live deal flow.
          </p>
        </div>
        <Button
          onClick={() => {
            resetDraft();
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Document Families</p>
          <p className="text-2xl font-semibold mt-1">{metrics.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Signed Documents</p>
          <p className="text-2xl font-semibold mt-1">{metrics.signed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Public Trust Docs</p>
          <p className="text-2xl font-semibold mt-1">{metrics.publicDocs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Contracts</p>
          <p className="text-2xl font-semibold mt-1">{metrics.contracts}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Versioned Deal Documents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every update creates a new version so agreements stay auditable.
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading documents...</div>
        ) : groupedDocuments.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No documents yet. Create your first agreement or offer letter to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedDocuments.map((group) => {
              const latest = group.versions[0];
              return (
                <div key={group.familyId} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{latest.title}</h3>
                        <Badge>{formatLabel(latest.document_type)}</Badge>
                        <Badge variant="outline">v{latest.version_number}</Badge>
                        {latest.public_visibility && (
                          <Badge variant="secondary">
                            <Globe className="w-3 h-3 mr-1" />
                            Public trust
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {latest.deal_case?.listing?.property?.address ||
                          latest.transaction?.listing?.property?.address ||
                          "Linked deal document"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Status: {formatLabel(latest.status)}</span>
                        <span>Updated {formatRelative(latest.updated_at)}</span>
                        <span>{group.versions.length} version{group.versions.length === 1 ? "" : "s"}</span>
                      </div>
                      {latest.public_summary && (
                        <p className="rounded-lg bg-secondary/20 px-3 py-2 text-sm">
                          {latest.public_summary}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleOpenVersionDialog(latest)}>
                        <History className="w-4 h-4" />
                        New Version
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePublic(latest)}
                      >
                        <Globe className="w-4 h-4" />
                        {latest.public_visibility ? "Hide Public Copy" : "Show Public Copy"}
                      </Button>
                      <Button size="sm" onClick={() => setSignDialogDocument(latest)}>
                        <PenSquare className="w-4 h-4" />
                        Sign
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        Linked Lead
                      </p>
                      <p className="font-medium">
                        {latest.deal_case?.user?.full_name ||
                          latest.deal_case?.user?.email ||
                          "Not linked"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        Signatures
                      </p>
                      <p className="font-medium">
                        {(latest.signatures || []).length} captured
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{sourceDocument ? "Create New Version" : "New Document"}</DialogTitle>
            <DialogDescription>
              Use this to generate agreements, offer letters, contracts, and public trust copies.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
              <div>
                <label className="block mb-2 text-sm text-foreground">Document type</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.documentType}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, documentType: event.target.value }))
                  }
                >
                  {[
                    "agreement",
                    "offer_letter",
                    "lease_contract",
                    "sale_contract",
                    "receipt_attachment",
                    "other",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm text-foreground">Linked lead</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.dealCaseId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dealCaseId: event.target.value }))
                  }
                >
                  <option value="">No linked lead</option>
                  {dealCases.map((dealCase) => (
                    <option key={dealCase.id} value={dealCase.id}>
                      {dealCase.user?.full_name || dealCase.user?.email || "Lead"} -{" "}
                      {dealCase.listing?.property?.address || "Property"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm text-foreground">Linked payment</label>
                <select
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.transactionId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, transactionId: event.target.value }))
                  }
                >
                  <option value="">No linked payment</option>
                  {payments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {payment.provider_reference} -{" "}
                      {formatMoney(payment.amount_minor, payment.currency || "GHS")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="External signer name"
                value={draft.externalSignerName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, externalSignerName: event.target.value }))
                }
              />
              <Input
                label="External signer email"
                type="email"
                value={draft.externalSignerEmail}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, externalSignerEmail: event.target.value }))
                }
              />
            </div>

            <Input
              label="Public summary"
              value={draft.publicSummary}
              onChange={(event) =>
                setDraft((current) => ({ ...current, publicSummary: event.target.value }))
              }
            />

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.publicVisibility}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      publicVisibility: event.target.checked,
                    }))
                  }
                />
                Public trust visibility
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.signatureRequired}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      signatureRequired: event.target.checked,
                    }))
                  }
                />
                Signature required
              </label>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerateTemplate}>
                <FileSignature className="w-4 h-4" />
                Generate Template
              </Button>
            </div>

            <div>
              <label className="block mb-2 text-sm text-foreground">Document content</label>
              <Textarea
                value={draft.contentMarkdown}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    contentMarkdown: event.target.value,
                  }))
                }
                className="min-h-[280px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveDocument()} disabled={saving}>
              {saving ? "Saving..." : sourceDocument ? "Save Version" : "Create Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(signDialogDocument)} onOpenChange={() => setSignDialogDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Capture a typed e-signature for the selected document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Signer name"
              value={signDraft.signerName}
              onChange={(event) =>
                setSignDraft((current) => ({ ...current, signerName: event.target.value }))
              }
            />
            <Input
              label="Signer email"
              type="email"
              value={signDraft.signerEmail}
              onChange={(event) =>
                setSignDraft((current) => ({ ...current, signerEmail: event.target.value }))
              }
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Signer role</label>
              <select
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                value={signDraft.signerRole}
                onChange={(event) =>
                  setSignDraft((current) => ({ ...current, signerRole: event.target.value }))
                }
              >
                {["organization_representative", "client", "witness", "manager"].map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogDocument(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSignDocument()} disabled={saving}>
              {saving ? "Signing..." : "Complete Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
