import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router";
import {
  FileSignature,
  CheckCircle2,
  Users,
  ShieldCheck,
  Lock,
  ExternalLink,
  Eye,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  Stamp,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/badge";
import { eSignatureService } from "../../lib/esignature.service";
import { leaseEsignatureService } from "../../lib/lease-esignature.service";
import { sanitizePublicDocumentUrl } from "../../lib/sanitize-document-url";
import { OperationalQueryState } from "../components/ux";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";

type PublicSigningRequest = Awaited<ReturnType<typeof eSignatureService.getRequestByToken>>;

export function PublicSignDocument() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const signerToken = searchParams.get("st")?.trim() || "";
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<PublicSigningRequest | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [signed, setSigned] = useState(false);
  const [partialComplete, setPartialComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [docExpanded, setDocExpanded] = useState(false);

  const signersSummary = useMemo(
    () => (Array.isArray(request?.signers_summary) ? request.signers_summary : []),
    [request?.signers_summary],
  );

  const documentUrl = useMemo(
    () => sanitizePublicDocumentUrl(request?.document_url),
    [request?.document_url],
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLinkError("This signing link is invalid.");
      return;
    }
    if (!signerToken) {
      setLoading(false);
      setLinkError("This signing link is incomplete. Open the personal link from your email or SMS.");
      return;
    }

    void (async () => {
      try {
        const row = await eSignatureService.getRequestByToken(token, signerToken);
        setRequest(row);
        if (row.current_signer_name) setSignatureName(row.current_signer_name);
      } catch (err: any) {
        setLinkError(err.message || "Signing link invalid or expired");
        toast.error(err.message || "Signing link invalid or expired");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, signerToken]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !signerToken) return;
    try {
      setSubmitting(true);
      const result = await eSignatureService.signWithToken(token, signerToken, signatureName);
      await leaseEsignatureService.handleLeaseSigningProgress(result);

      if (result?.status === "completed") {
        setSigned(true);
        toast.success("Document fully executed");
      } else if (result?.status === "partially_signed") {
        setPartialComplete(true);
        toast.success("Your signature recorded — awaiting countersignature");
      } else {
        setSigned(true);
        toast.success("Document signed successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign document");
    } finally {
      setSubmitting(false);
    }
  };

  const queryPhase = loading ? "loading" : linkError || !request ? "error" : "ready";

  return (
    <StandalonePageShell maxWidthClassName="max-w-2xl">
      <div className="py-10 px-4 space-y-6">
        <OperationalQueryState
          phase={queryPhase}
          errorMessage={linkError || (!loading && !request ? "This signing link is invalid or has expired." : undefined)}
          loadingFallback={
            <div className="py-24 text-center space-y-3">
              <FileSignature className="h-8 w-8 animate-bounce text-primary mx-auto" />
              <p className="text-sm text-ink-muted">Loading secure signing envelope...</p>
            </div>
          }
        >
        {linkError || !request ? (
          <Card className="p-10 text-center space-y-4 max-w-md mx-auto border-red-500/30 bg-surface/90 backdrop-blur-md rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-display font-semibold text-ink">Signing Link Inactive</h1>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {linkError || "This signing link is invalid or has expired."}
            </p>
            <Link to="/">
              <Button variant="outline" size="sm" className="mt-2">
                Return to BaytMiftah
              </Button>
            </Link>
          </Card>
        ) : signed ? (
          <Card
            variant="glass"
            className="p-8 sm:p-10 text-center space-y-6 border border-emerald-500/30 bg-surface/90 backdrop-blur-md rounded-3xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
              <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl pointer-events-none" />
            </div>

            <div className="space-y-2">
              <Badge variant="success" dot className="text-xs font-bold px-3 py-1">
                Cryptographically Executed
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-display font-medium text-ink">
                Document Signed Successfully
              </h1>
              <p className="text-sm text-ink-secondary max-w-md mx-auto leading-relaxed">
                <strong>{request.document_name}</strong> has been legally signed with verified cryptographic timestamps and audit logging.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border inline-flex flex-col items-center gap-1.5 max-w-md w-full text-xs text-ink-muted">
              <div className="flex items-center gap-2 font-mono font-bold text-ink">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>SHA-256 Anchored & Act 772 Compliant</span>
              </div>
              <span>Audit Certificate & Signed Copy delivered via email.</span>
            </div>

            <div className="pt-2">
              <Link to="/">
                <Button variant="gradient" className="gap-2">
                  <span>Return to Home</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card
            variant="glass"
            className="p-6 sm:p-8 space-y-6 border border-surface-border/80 bg-surface/90 backdrop-blur-md rounded-3xl shadow-xl"
          >
            {/* Document Header */}
            <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-surface/80 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs font-semibold capitalize">
                  {request.document_type?.replace(/_/g, " ") || "Legal Agreement"}
                </Badge>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span>256-Bit SSL Escrow Signing</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-display font-medium text-ink">
                {request.document_name || "Document Signing Envelope"}
              </h1>

              <p className="text-xs text-ink-secondary">
                Legally binding digital execution pursuant to the <strong>Ghana Electronic Transactions Act, 2008 (Act 772)</strong>.
              </p>
            </div>

            {/* Multi-party progress rail */}
            {signersSummary.length > 1 && (
              <div className="rounded-2xl border border-surface-border bg-surface-subtle/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>Signing Workflow Parties</span>
                  </div>
                  <span className="font-mono text-ink-muted">
                    {signersSummary.filter((s) => s.status === "signed").length} / {signersSummary.length} Complete
                  </span>
                </div>

                <div className="space-y-2">
                  {signersSummary.map((signer, index) => {
                    const isSignerDone = signer.status === "signed";
                    return (
                      <div
                        key={`${signer.name}-${index}`}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                          isSignerDone
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 font-medium"
                            : "border-surface-border bg-surface text-ink-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-surface-subtle text-ink-muted">
                            {index + 1}
                          </span>
                          <span className="font-medium text-ink">{signer.name || "Signer"}</span>
                          {signer.role && (
                            <span className="text-[10px] text-ink-muted capitalize">({signer.role})</span>
                          )}
                        </div>

                        <Badge
                          variant={isSignerDone ? "success" : "outline"}
                          dot={!isSignerDone}
                          className="text-[10px] font-bold uppercase"
                        >
                          {isSignerDone ? "Signed" : "Pending"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partial Complete Notice */}
            {partialComplete && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <p>
                  Your signature has been securely registered! The next countersigning party has been notified to complete the execution.
                </p>
              </div>
            )}

            {/* Document Preview Box */}
            {request.document_body ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span className="font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Agreement Clauses & Terms
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocExpanded(!docExpanded)}
                    className="text-primary hover:underline text-[11px] font-medium"
                  >
                    {docExpanded ? "Collapse View" : "Expand All"}
                  </button>
                </div>
                <div
                  className={`rounded-2xl border border-surface-border bg-surface-subtle/60 p-4 font-mono text-xs whitespace-pre-wrap text-ink leading-relaxed overflow-y-auto ${
                    docExpanded ? "max-h-[500px]" : "max-h-56"
                  }`}
                >
                  {request.document_body}
                </div>
              </div>
            ) : documentUrl ? (
              <div className="p-4 rounded-2xl border border-surface-border bg-surface-subtle/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-ink">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>View Full Agreement Document (PDF)</span>
                </div>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Open PDF</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : null}

            {/* Signing Form */}
            {!partialComplete && request.current_signer_name ? (
              <form onSubmit={handleSign} className="space-y-5 pt-2 border-t border-surface-border">
                <div className="p-3.5 rounded-2xl border border-surface-border bg-surface-subtle/50 text-xs space-y-1">
                  <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                    Authorized Signatory
                  </span>
                  <p className="font-bold text-ink text-sm">{request.current_signer_name}</p>
                  {request.current_signer_email && (
                    <p className="text-ink-secondary font-mono">{request.current_signer_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Stamp className="w-3.5 h-3.5 text-primary" />
                    <span>Type Full Legal Name to Sign *</span>
                  </label>
                  <Input
                    placeholder="Kwame Mensah"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    required
                    className="font-serif italic text-base tracking-wide py-2.5"
                  />
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    By typing your name and clicking &quot;Adopt &amp; Sign Document&quot;, you acknowledge that this digital signature constitutes a legally binding agreement under Ghana Act 772.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  disabled={submitting || !signatureName.trim()}
                  className="w-full gap-2 text-sm shadow-md"
                >
                  <Stamp className="w-4 h-4" />
                  <span>{submitting ? "Cryptographically Signing..." : "Adopt & Sign Document"}</span>
                </Button>
              </form>
            ) : partialComplete ? null : (
              <p className="text-xs text-center text-ink-muted py-4">
                All parties have executed this envelope.
              </p>
            )}
          </Card>
        )}
        </OperationalQueryState>
      </div>
    </StandalonePageShell>
  );
}
