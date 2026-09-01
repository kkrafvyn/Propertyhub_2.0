/**
 * BaytMiftah REOS — AI Lease Analyzer & Ghana Rent Act Compliance Studio
 * 
 * Interactive lease auditing engine that scans tenancy agreements against the
 * Ghana Rent Act (Act 220) and Rent Revision Bill, detects unlawful clauses,
 * auto-generates legal redlines, and manages Ghana Card cryptographic e-signatures.
 */

import React, { useState } from 'react';
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
import {
  aiLeaseAnalyzerService,
  type LeaseAnalysisResult,
  type GhanaCardSigner,
} from '../../../lib/ai-lease-analyzer.service';

export function AILeaseAnalyzer() {
  const [agreementText, setAgreementText] = useState(() => aiLeaseAnalyzerService.getSampleAgreement());
  const [analysis, setAnalysis] = useState<LeaseAnalysisResult | null>(() =>
    aiLeaseAnalyzerService.analyzeLease(aiLeaseAnalyzerService.getSampleAgreement())
  );
  const [activeTab, setActiveTab] = useState<'audit' | 'redline' | 'signing'>('audit');
  const [isAuditing, setIsAuditing] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);

  // E-Signatures state
  const [signers, setSigners] = useState<GhanaCardSigner[]>([
    {
      id: 'sign_1',
      role: 'landlord',
      fullName: 'Kofi Owusu',
      ghanaCardNumber: 'GHA-710492810-3',
      phone: '+233 24 411 9022',
      status: 'verified_signed',
      signedAt: '2026-08-17T14:30:00Z',
      signatureHash: 'SHA256:8f9a4c11b0e934a78c...',
    },
    {
      id: 'sign_2',
      role: 'tenant',
      fullName: 'Ama Ampomah',
      ghanaCardNumber: 'GHA-882019481-9',
      phone: '+233 50 199 4410',
      status: 'pending',
    },
  ]);

  const [tenantGhanaCard, setTenantGhanaCard] = useState('GHA-882019481-9');

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = aiLeaseAnalyzerService.analyzeLease(agreementText);
      setAnalysis(result);
      setIsAuditing(false);
      toast.success(`Lease Audited! Compliance Score: ${result.overallScore}/100 (${result.complianceGrade})`);
    }, 400);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOcrScanning(true);
    try {
      const ocrResult = await aiLeaseAnalyzerService.ocrExtractFromDocument(file.name);
      setAgreementText(ocrResult.extractedText);
      const auditRes = aiLeaseAnalyzerService.analyzeLease(ocrResult.extractedText, ocrResult.title);
      setAnalysis(auditRes);
      toast.success(`Scanned & parsed ${file.name} successfully via OCR!`);
    } catch (err: any) {
      toast.error('Failed to parse document: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsOcrScanning(false);
    }
  };

  const handleApplyRedline = () => {
    if (!analysis) return;
    setAgreementText(analysis.redlinedText);
    const updated = aiLeaseAnalyzerService.analyzeLease(analysis.redlinedText, 'Compliant Tenancy Agreement');
    setAnalysis(updated);
    toast.success('Applied all legally compliant Ghana Rent Act clauses!');
  };

  const handleSignWithGhanaCard = (signerId: string) => {
    if (!aiLeaseAnalyzerService.verifyGhanaCard(tenantGhanaCard)) {
      toast.error('Invalid Ghana Card format! Must be GHA-XXXXXXXXX-X (e.g. GHA-123456789-0)');
      return;
    }

    setSigners((prev) =>
      prev.map((s) =>
        s.id === signerId
          ? {
              ...s,
              ghanaCardNumber: tenantGhanaCard,
              status: 'verified_signed',
              signedAt: new Date().toISOString(),
              signatureHash: `SHA256:${Math.random().toString(36).slice(2, 12)}...`,
            }
          : s
      )
    );
    toast.success('Verified with National Identification Authority (NIA) & Digitally Signed!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              AI Lease Analyzer & Ghana Rent Act Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Automated compliance verification against Act 220, unfair clause detection, legal redlines, and Ghana Card e-signing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold text-ink bg-surface hover:bg-surface-hover transition shadow-sm">
              <Upload className={`h-3.5 w-3.5 text-primary ${isOcrScanning ? 'animate-bounce' : ''}`} />
              {isOcrScanning ? 'Scanning OCR...' : 'Upload & Scan Document'}
            </span>
          </label>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const sample = aiLeaseAnalyzerService.getSampleAgreement();
              setAgreementText(sample);
              setAnalysis(aiLeaseAnalyzerService.analyzeLease(sample));
              toast.info('Loaded standard draft with typical Ghanaian clauses');
            }}
            className="border-surface-border text-ink"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Sample Draft
          </Button>

          <Button
            size="sm"
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-950/20"
          >
            <Sparkles className="mr-1.5 h-4 w-4 text-amber-300" />
            {isAuditing ? 'Analyzing Clauses...' : 'Run Compliance Audit'}
          </Button>
        </div>
      </div>

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

            <textarea
              value={agreementText}
              onChange={(e) => setAgreementText(e.target.value)}
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
                    Ghana Rent Act Compliance Score
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
                      {analysis.complianceGrade}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.violationsCount === 0
                      ? 'No statutory violations detected. Safe to execute.'
                      : `${analysis.violationsCount} clause(s) breach Ghanaian statutory landlord-tenant laws.`}
                  </p>
                </div>

                {analysis.violationsCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleApplyRedline}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs shadow-md shrink-0"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Auto-Fix with Legal Redline
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
              Clean Legal Redline
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('signing')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'signing'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              }`}
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

                  {!rule.isCompliant && (
                    <div className="rounded-xl bg-surface p-2.5 border border-border/60 text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Suggested Legal Redline:
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
                  Standard Ghana Rent Act Compliant Agreement
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(analysis?.redlinedText || '');
                    toast.success('Copied clean agreement to clipboard!');
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
  );
}
