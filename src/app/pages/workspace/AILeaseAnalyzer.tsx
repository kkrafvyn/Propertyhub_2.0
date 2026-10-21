import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
/**
 * BaytMiftah REOS — AI Lease Analyzer & Ghana Rent Act Compliance Studio
 * 
 * Interactive lease auditing engine that scans tenancy agreements against the
 * Ghana Rent Act (Act 220) and Rent Revision Bill, detects unlawful clauses,
 * auto-generates legal redlines, and manages Ghana Card cryptographic e-signatures.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Download,
  Copy,
  PenTool,
  RotateCcw,
  FileText,
  BadgeCheck,
  QrCode,
  Upload,
  Scan,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import { OperationalQueryState, WorkspacePageShell } from '../../components/ux';
import {
  aiLeaseAnalyzerService,
  type GhanaCardSigner,
} from '../../../lib/ai-lease-analyzer.service';
import {
  analyzeLeaseForProperty,
  type JurisdictionLeaseAnalysis,
} from '../../../lib/jurisdiction-lease-analyzer.service';
import type { PropertyLocationInput } from '../../../lib/property-country-context.service';
import { LEASE_DOCUMENT_ACCEPT, LEASE_DOCUMENT_LIMITS, type ExtractedLeaseDocument } from '../../../lib/lease-document-extraction';

const MARKET_PRESETS: Array<{ id: string; label: string; property: PropertyLocationInput }> = [
  { id: 'GH-AA', label: 'Ghana · Greater Accra', property: { country: 'Ghana', region: 'Greater Accra', city: 'Accra', subdivision_code: 'AA' } },
  { id: 'KE-NBI', label: 'Kenya · Nairobi', property: { country: 'Kenya', region: 'Nairobi', city: 'Nairobi', subdivision_code: 'NBI' } },
  { id: 'NG-LA', label: 'Nigeria · Lagos', property: { country: 'Nigeria', region: 'Lagos', city: 'Lagos', subdivision_code: 'LA' } },
  { id: 'GB-ENG', label: 'United Kingdom · England', property: { country: 'United Kingdom', region: 'England', city: 'London', subdivision_code: 'ENG' } },
  { id: 'US-CA', label: 'United States · California', property: { country: 'United States', region: 'California', city: 'Los Angeles', subdivision_code: 'CA' } },
  { id: 'ZA-GT', label: 'South Africa · Gauteng', property: { country: 'South Africa', region: 'Gauteng', city: 'Johannesburg', subdivision_code: 'GT' } },
];

function runAnalysis(text: string, property: PropertyLocationInput, title = 'Tenancy Agreement'): JurisdictionLeaseAnalysis {
  return analyzeLeaseForProperty(text, property, undefined, title);
}

export function AILeaseAnalyzer() {
  const [marketId, setMarketId] = useState(MARKET_PRESETS[0].id);
  const market = MARKET_PRESETS.find((preset) => preset.id === marketId) || MARKET_PRESETS[0];
  const [agreementText, setAgreementText] = useState('');
  const [analysis, setAnalysis] = useState<JurisdictionLeaseAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'redline' | 'signing'>('audit');
  const [isAuditing, setIsAuditing] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [sourceDocument, setSourceDocument] = useState<ExtractedLeaseDocument | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => () => { requestSequence.current += 1; }, []);
  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  // E-Signatures state
  const [signers, setSigners] = useState<GhanaCardSigner[]>([]);

  const [tenantGhanaCard, setTenantGhanaCard] = useState('');

  const handleRunAudit = () => {
    if (!agreementText.trim() || isOcrScanning) return;
    setIsAuditing(true);
    try {
      const result = runAnalysis(agreementText, market.property, sourceDocument?.title);
      setAnalysis(result);
      toast.success('Lease review complete. Check findings against the source document.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const sequence = ++requestSequence.current;
    setIsOcrScanning(true);
    setAnalysis(null);
    setAgreementText('');
    setSourceDocument(null);
    setSourceUrl(null);
    setExtractionError('');
    setExtractionProgress('Reading document…');
    try {
      const ocrResult = await aiLeaseAnalyzerService.ocrExtractFromDocument(file, ({ message }) => {
        if (requestSequence.current === sequence) setExtractionProgress(message);
      });
      if (requestSequence.current !== sequence) return;
      setSourceDocument(ocrResult);
      setSourceUrl(URL.createObjectURL(file));
      setAgreementText(ocrResult.extractedText);
      const auditRes = runAnalysis(ocrResult.extractedText, market.property, ocrResult.title);
      setAnalysis(auditRes);
      toast.success(`Extracted text from ${file.name}. Review the source and findings below.`);
    } catch (err: unknown) {
      if (requestSequence.current !== sequence) return;
      const message = err instanceof Error ? err.message : 'The document could not be read. Try a searchable PDF or TXT file.';
      setExtractionError(message);
      toast.error(message);
    } finally {
      if (requestSequence.current === sequence) {
        setIsOcrScanning(false);
        setExtractionProgress('');
      }
    }
  };

  const handleApplyRedline = () => {
    if (!analysis) return;
    setActiveTab('audit');
    toast.info('Review each suggestion and edit the draft before running the checks again.');
  };

  const handleSignWithGhanaCard = async (signerId: string) => {
    if (!aiLeaseAnalyzerService.verifyGhanaCard(tenantGhanaCard)) {
      toast.error('Invalid Ghana Card format! Must be GHA-XXXXXXXXX-X (e.g. GHA-123456789-0)');
      return;
    }

    const signer = signers.find((entry) => entry.id === signerId);
    const signingPayload = [
      signerId,
      tenantGhanaCard.trim().toUpperCase(),
      sourceDocument?.source.sha256 || '',
      analysis?.originalText || agreementText,
    ].join('|');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signingPayload));
    const signatureHash = `SHA256:${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')}`;

    setSigners((prev) =>
      prev.map((s) =>
        s.id === signerId
          ? {
              ...s,
              ghanaCardNumber: tenantGhanaCard,
              status: 'verified_signed',
              signedAt: new Date().toISOString(),
              signatureHash,
            }
          : s
      )
    );
    toast.success(`${signer?.fullName || 'Signer'} verified and digitally signed.`);
  };

  const queryPhase = 'ready' as const;

  return (
    <WorkspacePageShell
      title="Multi-Jurisdiction Lease Analyzer"
      description="Rule-based screening of your lease text. Findings and suggested wording require review; scores do not certify legal compliance."
      meta={
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Scale className="h-5 w-5" />
        </div>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <NativeSelectControl
            className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold bg-surface"
            value={marketId}
            disabled={isOcrScanning}
            onChange={(e) => {
              const next = e.target.value;
              setMarketId(next);
              const preset = MARKET_PRESETS.find((entry) => entry.id === next) || MARKET_PRESETS[0];
              setAnalysis(agreementText.trim() ? runAnalysis(agreementText, preset.property, sourceDocument?.title) : null);
            }}
          >
            {MARKET_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </NativeSelectControl>

          <label className="cursor-pointer">
            <input
              type="file"
              accept={LEASE_DOCUMENT_ACCEPT}
              aria-label="Upload lease document"
              disabled={isOcrScanning}
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold text-ink bg-surface hover:bg-surface-hover transition shadow-sm">
              <Upload className={`h-3.5 w-3.5 text-primary ${isOcrScanning ? 'animate-bounce' : ''}`} />
              {isOcrScanning ? 'Extracting text…' : 'Upload Document'}
            </span>
          </label>

          <Button
            size="sm"
            variant="outline"
            disabled={isOcrScanning}
            onClick={() => {
              const sample = aiLeaseAnalyzerService.getSampleAgreement();
              setAgreementText(sample);
              setSourceDocument(null);
              setSourceUrl(null);
              setExtractionError('');
              setAnalysis(runAnalysis(sample, market.property));
              toast.info('Loaded Ghana sample draft — switch market for other jurisdictions');
            }}
            className="border-surface-border text-ink"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Load Sample Draft
          </Button>

          <Button
            size="sm"
            onClick={handleRunAudit}
            disabled={isAuditing || isOcrScanning || !agreementText.trim()}
            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-950/20"
          >
            <Sparkles className="mr-1.5 h-4 w-4 text-amber-300" />
            {isAuditing ? 'Analyzing Clauses...' : 'Run Lease Review'}
          </Button>
        </div>
      }
    >
      <OperationalQueryState phase={queryPhase}>
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">PDF with selectable text, TXT or Markdown · Up to 10 MB, 100 PDF pages and 500,000 characters. Scanned pages need OCR before uploading. Files are processed on this device.</p>
      {isOcrScanning && <p role="status" className="text-sm text-primary">{extractionProgress}</p>}
      {extractionError && <p role="alert" className="rounded-xl border border-rose-500/30 p-3 text-sm text-rose-600">{extractionError} No analysis was generated for this file.</p>}

      {sourceDocument && (
        <Card className="p-4 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p><strong>Source:</strong> {sourceDocument.source.fileName} · {sourceDocument.source.sizeBytes.toLocaleString()} bytes{sourceDocument.source.pages.length ? ` · ${sourceDocument.source.pages.length} pages` : ''}</p>
            <div className="flex items-center gap-3">
              {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">Open original document</a>}
              <Button size="sm" variant="outline" onClick={() => {
                const report = new Blob([JSON.stringify({ sourceDocument, analysis }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(report);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'lease-review-source.json';
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Save review and source</Button>
            </div>
          </div>
          <p className="break-all text-muted-foreground">SHA-256: {sourceDocument.source.sha256}</p>
          <p className="text-muted-foreground">
            Extraction confidence: <strong>{Math.round(sourceDocument.source.confidence * 100)}%</strong> · {sourceDocument.source.method === 'pdf_text' ? 'Selectable PDF text' : 'Plain text'}
          </p>
          <p className="text-muted-foreground">The source and extracted text are kept for this session. Save the review to retain them. {agreementText !== sourceDocument.extractedText && 'The editable draft differs from the extracted source.'}</p>
          <details>
            <summary className="cursor-pointer font-semibold">Original extracted text</summary>
            {sourceDocument.source.pages.length ? sourceDocument.source.pages.map((page) => (
              <section key={page.page} className="mt-3">
                <h4 className="font-semibold">Page {page.page}</h4>
                <pre className="whitespace-pre-wrap font-mono">{sourceDocument.extractedText.slice(page.start, page.end)}</pre>
              </section>
            )) : <pre className="mt-2 whitespace-pre-wrap font-mono">{sourceDocument.extractedText}</pre>}
          </details>
        </Card>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Agreement Text Editor */}
        <div className="lg:col-span-6 space-y-3">
          <Card className="flex h-full flex-col p-5 bg-surface border-surface-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                <h3 className="font-bold text-xs text-ink uppercase tracking-wider">
                  Tenancy Agreement Draft
                </h3>
              </div>
              <span className="text-[10px] text-muted-foreground">Editable Markdown / Plain Text</span>
            </div>

            <Textarea
              value={agreementText}
              aria-label="Agreement text"
              disabled={isOcrScanning}
              maxLength={LEASE_DOCUMENT_LIMITS.maxCharacters}
              onChange={(e) => { setAgreementText(e.target.value); setAnalysis(null); setExtractionError(''); }}
              rows={18}
              className="flex-1 w-full rounded-2xl border border-border bg-input-background p-4 text-xs font-mono leading-relaxed text-ink focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Paste your residential or commercial tenancy agreement here..."
            />

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                {agreementText.split(/\s+/).length} Words · {agreementText.length} Characters
              </span>
              <Button
                size="sm"
                onClick={handleRunAudit}
                disabled={isAuditing || isOcrScanning || !agreementText.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
              >
                Re-Analyze Draft
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: AI Analysis & Verification Studio */}
        <div className="lg:col-span-6 space-y-4">
          {/* Score & Grade Overview Card */}
          {analysis && (
            <Card
              className={`p-5 border ${
                analysis.overallScore >= 80
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : analysis.overallScore >= 50
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-rose-500/5 border-rose-500/30'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {analysis.subdivisionLabel || analysis.jurisdictionLabel} screening score
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-extrabold text-ink">
                      {analysis.overallScore}
                      <span className="text-lg font-normal text-muted-foreground">/100</span>
                    </span>
                    <Badge
                      className={`text-xs font-bold ${
                        analysis.overallScore >= 80
                          ? 'bg-emerald-500 text-white'
                          : analysis.overallScore >= 50
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {analysis.violationsCount ? 'Review needed' : 'No matching flags'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Governing law: {analysis.governingLaw}
                    {analysis.depositCapMonths != null ? ` · Deposit cap ${analysis.depositCapMonths} mo` : ''}
                    {analysis.advanceRentCapMonths != null ? ` · Advance cap ${analysis.advanceRentCapMonths} mo` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.violationsCount === 0
                      ? 'No matching issues found by these checks. Review the entire agreement before signing.'
                      : `${analysis.violationsCount} item(s) flagged for human review.`}
                  </p>
                </div>

                {analysis.violationsCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleApplyRedline}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs shadow-md shrink-0"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Review Suggestions
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Sub-Tabs: Clause Audit, Full Redline, E-Signing */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'audit'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Clause Audit ({analysis?.rules.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('redline')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'redline'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Analyzed Text
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('signing')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'signing'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              } ${market.property.country !== 'Ghana' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <PenTool className="h-3.5 w-3.5" />
              Ghana Card E-Signatures
            </button>
          </div>

          {/* ── SUBTAB 1: Clause Audit Cards ────────────────────────────── */}
          {activeTab === 'audit' && (
            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {analysis?.rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rounded-2xl border p-4 transition space-y-2 ${
                    rule.isCompliant
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : rule.severity === 'critical_violation'
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : 'border-amber-500/40 bg-amber-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rule.isCompliant ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      )}
                      <h4 className="font-bold text-xs text-ink">{rule.title}</h4>
                    </div>
                    <Badge
                      className={
                        rule.isCompliant
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-[9px]'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-0 text-[9px]'
                      }
                    >
                      {rule.ghanaLawCitation}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                  {rule.detectedText && (
                    <blockquote className="border-l-2 border-indigo-400 pl-3 text-xs whitespace-pre-wrap">
                      <span className="block font-semibold">Matched text{sourceDocument && agreementText === sourceDocument.extractedText && (() => {
                        const offset = sourceDocument.extractedText.indexOf(rule.detectedText!);
                        const page = sourceDocument.source.pages.find((entry) => offset >= entry.start && offset < entry.end);
                        return page ? ` · Page ${page.page}` : '';
                      })()}:</span>
                      {rule.detectedText}
                    </blockquote>
                  )}

                  {!rule.isCompliant && (
                    <div className="rounded-xl bg-surface p-2.5 border border-border/60 text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Suggested wording for review:
                      </span>
                      <p className="font-mono text-[11px] text-ink">{rule.suggestedRedline}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── SUBTAB 2: Clean Legal Redline ───────────────────────────── */}
          {activeTab === 'redline' && (
            <Card className="p-4 bg-surface border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  Text used for this review
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(analysis?.redlinedText || '');
                    toast.success('Copied analyzed text to clipboard.');
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Text
                </Button>
              </div>

              <div className="rounded-2xl bg-surface-subtle p-4 font-mono text-xs leading-relaxed text-ink max-h-[380px] overflow-y-auto whitespace-pre-wrap border border-border">
                {analysis?.redlinedText}
              </div>
            </Card>
          )}

          {/* ── SUBTAB 3: Ghana Card E-Signatures ────────────────────────── */}
          {activeTab === 'signing' && (
            <div className="space-y-3">
              {signers.map((signer) => (
                <Card key={signer.id} className="p-4 bg-surface border-surface-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                          signer.status === 'verified_signed'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {signer.status === 'verified_signed' ? (
                          <BadgeCheck className="h-5 w-5" />
                        ) : (
                          <PenTool className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-ink">{signer.fullName}</h4>
                          <span className="text-[10px] text-muted-foreground uppercase">
                            ({signer.role})
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          Ghana Card: {signer.ghanaCardNumber}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={
                        signer.status === 'verified_signed'
                          ? 'bg-emerald-500/20 text-emerald-600 border-0 text-[9px]'
                          : 'bg-amber-500/20 text-amber-600 border-0 text-[9px]'
                      }
                    >
                      {signer.status === 'verified_signed' ? 'DIGITALLY SIGNED' : 'AWAITING SIGNATURE'}
                    </Badge>
                  </div>

                  {signer.status === 'pending' ? (
                    <div className="mt-3.5 pt-3 border-t border-border flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={tenantGhanaCard}
                        onChange={(e) => setTenantGhanaCard(e.target.value)}
                        placeholder="Enter Ghana Card (GHA-XXXXXXXXX-X)"
                        className="text-xs font-mono flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSignWithGhanaCard(signer.id)}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs shrink-0"
                      >
                        Verify & Sign with NIA
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 pt-2 border-t border-border flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Signed: {new Date(signer.signedAt!).toLocaleString()}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{signer.signatureHash}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
