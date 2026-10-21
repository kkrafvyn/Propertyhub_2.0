/**
 * BaytMiftah REOS — Company Launchpad (White-Label App Platform & Live Studio)
 * 
 * Interactive studio allowing real estate developers & property managers to customize
 * brand colors, logos, domain mapping, and preview their branded mobile/web app in real time.
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Globe,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Send,
  Zap,
  Building2,
  Droplets,
  Wrench,
  QrCode,
  Scale,
  DollarSign,
  Layers,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import {
  whitelabelPlatformService,
  BRAND_PRESETS,
  type WhitelabelConfig,
} from '../../../lib/whitelabel-platform.service';
import { OperationalQueryState, WorkspacePageShell } from '../../components/ux';

export function CompanyLaunchpad({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [config, setConfig] = useState<WhitelabelConfig>(() =>
    whitelabelPlatformService.getDefaultConfig()
  );
  const [activeTab, setActiveTab] = useState<'theme' | 'domain' | 'modules'>('theme');
  const [isDeploying, setIsDeploying] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    setLoadingConfig(true);
    setLoadError(null);
    whitelabelPlatformService
      .getConfig(organizationId)
      .then(setConfig)
      .catch((error) => {
        const message = error?.message || 'Unable to load white-label settings.';
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoadingConfig(false));
  }, [organizationId]);

  const applyPreset = async (presetKey: string) => {
    const preset = BRAND_PRESETS[presetKey];
    if (!preset) return;
    const updated = { ...config, ...preset };
    setConfig(updated);
    if (organizationId) {
      const saved = await whitelabelPlatformService.saveConfig(organizationId, updated);
      setConfig(saved);
    }
    toast.success(`Applied ${preset.companyName} Brand Preset!`);
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast.error('Select an organization before saving white-label settings.');
      return;
    }
    const saved = await whitelabelPlatformService.saveConfig(organizationId, config);
    setConfig(saved);
    toast.success('Custom brand settings saved successfully!');
  };

  const handleDeploy = async () => {
    if (!organizationId) {
      toast.error('Select an organization before publishing.');
      return;
    }
    setIsDeploying(true);
    try {
      const saved = await whitelabelPlatformService.publishConfig(organizationId, config);
      setConfig(saved);
      toast.success(
        `Branded app published${config.customDomain ? ` for ${config.customDomain}` : ''}.`
      );
    } catch (error: any) {
      toast.error(error?.message || 'Publish failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  const queryPhase = loadError ? 'error' : loadingConfig ? 'loading' : 'ready';

  return (
    <WorkspacePageShell
      title="Company Launchpad & White-Label Studio"
      description="Turn BaytMiftah into your company’s branded mobile and web app with custom domains, themes, and instant deployment."
      meta={
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Palette className="h-5 w-5" />
        </div>
      }
      actions={
        <>
          <Button
            size="sm"
            onClick={handleDeploy}
            disabled={isDeploying}
            style={{ backgroundColor: config.primaryColor }}
            className="text-white shadow-md hover:opacity-90"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {isDeploying ? 'Deploying App...' : 'Publish Branded App'}
          </Button>
        </>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => {
          if (organizationId) {
            setLoadError(null);
            setLoadingConfig(true);
            void whitelabelPlatformService.getConfig(organizationId).then(setConfig).catch((error) => {
              const message = error?.message || 'Unable to load white-label settings.';
              setLoadError(message);
            }).finally(() => setLoadingConfig(false));
          }
        }}
      >
    <div className="space-y-6">
      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Brand Configuration & Presets */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Preset Selector */}
          <Card className="p-4 bg-surface border-surface-border">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Popular Developer Themes:
            </span>
            <div className="grid grid-cols-2 gap-2.5 mt-2 sm:grid-cols-4">
              {Object.entries(BRAND_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="flex flex-col items-center justify-center rounded-2xl border border-border p-3 text-center transition hover:border-primary bg-surface-subtle"
                >
                  <div
                    className="h-6 w-6 rounded-full shadow-inner mb-1.5"
                    style={{ backgroundColor: preset.primaryColor }}
                  />
                  <span className="text-xs font-bold text-ink truncate w-full">
                    {preset.companyName}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'theme'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              Theme & Colors
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('domain')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'domain'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Custom Domain & SSL
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'modules'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-subtle'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Feature Modules
            </button>
          </div>

          {/* ── SUBTAB 1: Theme & Colors ──────────────────────────────── */}
          {activeTab === 'theme' && (
            <Card className="p-5 bg-surface border-surface-border space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-ink">Company / Platform Name</label>
                  <Input
                    value={config.companyName}
                    onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                    className="mt-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink">Brand Tagline</label>
                  <Input
                    value={config.brandTagline}
                    onChange={(e) => setConfig({ ...config, brandTagline: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <Input
                      value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Accent Highlight
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <Input
                      value={config.accentColor}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button size="sm" onClick={handleSave} className="text-xs">
                  Save Changes
                </Button>
              </div>
            </Card>
          )}

          {/* ── SUBTAB 2: Custom Domain & SSL ─────────────────────────── */}
          {activeTab === 'domain' && (
            <Card className="p-5 bg-surface border-surface-border space-y-4">
              <div>
                <label className="text-xs font-medium text-ink">Custom Web Domain</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={config.customDomain}
                    onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                    placeholder="e.g. app.yourcompany.com"
                    className="font-mono text-xs flex-1"
                  />
                  <Button size="sm" onClick={handleSave} className="text-xs shrink-0">
                    Verify DNS
                  </Button>
                </div>
              </div>

              {/* DNS Instruction Box */}
              <div className="rounded-2xl bg-surface-subtle p-4 border border-border text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">Required DNS CNAME Record:</span>
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-[9px]">
                    SSL ACTIVE
                  </Badge>
                </div>

                <div className="rounded-xl bg-surface p-2.5 font-mono text-xs text-ink border border-border flex items-center justify-between">
                  <span>CNAME: {config.customDomain} → cname.baytmiftah.app</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText('cname.baytmiftah.app');
                      toast.success('Copied DNS Target!');
                    }}
                    className="h-6 px-1.5 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatic Let’s Encrypt SSL certificate provisioned upon DNS propagation.
                </p>
              </div>
            </Card>
          )}

          {/* ── SUBTAB 3: Feature Modules ─────────────────────────────── */}
          {activeTab === 'modules' && (
            <Card className="p-5 bg-surface border-surface-border space-y-3">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Enable Platform Modules:
              </span>

              <div className="space-y-2.5 pt-2">
                {[
                  { key: 'residentMobileApp', label: 'Resident Mobile App (iOS / Android)' },
                  { key: 'qrGateClearance', label: 'QR Visitor Gate Clearance & Kiosk' },
                  { key: 'utilitySubmetering', label: 'Utility Sub-Metering & Generator Split' },
                  { key: 'artisanMoMoDispatch', label: 'Contractor MoMo Dispatch & Work Orders' },
                  { key: 'ownerInvestorPortal', label: 'Buildium-Grade Owner Payout Portal' },
                  { key: 'aiLeaseAnalyzer', label: 'AI Lease Analyzer & Ghana Rent Act Engine' },
                ].map((mod) => (
                  <label
                    key={mod.key}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-3 text-xs cursor-pointer hover:border-primary/50"
                  >
                    <span className="font-semibold text-ink">{mod.label}</span>
                    <input
                      type="checkbox"
                      checked={
                        (config.enabledModules as any)[mod.key]
                      }
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          enabledModules: {
                            ...config.enabledModules,
                            [mod.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-border"
                    />
                  </label>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Live App Preview Phone Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[320px] rounded-[42px] border-[8px] border-slate-900 bg-slate-950 p-3 shadow-2xl overflow-hidden">
            {/* Phone Speaker Notch */}
            <div className="mx-auto h-4 w-28 rounded-full bg-slate-900 mb-2" />

            {/* Mobile App Canvas */}
            <div className="rounded-[30px] bg-surface text-ink overflow-hidden flex flex-col h-[560px] text-xs shadow-inner">
              {/* App Branded Header */}
              <div
                className="p-4 text-white space-y-1 transition-colors"
                style={{ backgroundColor: config.primaryColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm tracking-tight">{config.companyName}</span>
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    GH
                  </div>
                </div>
                <p className="text-xs text-white/80">{config.brandTagline}</p>
              </div>

              {/* App Body Content */}
              <div className="p-3.5 space-y-3 flex-1 overflow-y-auto bg-surface">
                {/* Welcome Card */}
                <div className="rounded-2xl bg-surface-subtle p-3 border border-border space-y-1">
                  <span className="text-xs text-muted-foreground">Welcome Back,</span>
                  <h4 className="font-bold text-xs text-ink">Villa 14 — East Legon Hills</h4>
                </div>

                {/* Quick App Actions Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl p-3 text-white text-center cursor-pointer shadow-sm"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <QrCode className="h-5 w-5 mb-1" />
                    <span className="text-xs font-bold">Gate Pass</span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-2xl p-3 bg-surface-subtle border border-border text-center text-ink">
                    <Zap className="h-5 w-5 text-amber-500 mb-1" />
                    <span className="text-xs font-bold">Pay Utilities</span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-2xl p-3 bg-surface-subtle border border-border text-center text-ink">
                    <Wrench className="h-5 w-5 text-indigo-500 mb-1" />
                    <span className="text-xs font-bold">Artisan MoMo</span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-2xl p-3 bg-surface-subtle border border-border text-center text-ink">
                    <Scale className="h-5 w-5 text-emerald-500 mb-1" />
                    <span className="text-xs font-bold">Lease (Act 220)</span>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <div className="rounded-2xl bg-surface-subtle p-3 border border-border space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Active Utilities & Power
                  </span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-ink">ECG Sub-Meter</span>
                    <span className="font-mono font-bold text-emerald-600">4,820 kWh</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-ink">Cat Generator Split</span>
                    <span className="font-mono font-bold text-amber-600">₵194.25</span>
                  </div>
                </div>
              </div>

              {/* Bottom Nav Mock */}
              <div className="border-t border-border p-2 flex justify-around text-[9px] text-muted-foreground bg-surface">
                <span className="font-bold text-primary">Home</span>
                <span>Gate</span>
                <span>Bills</span>
                <span>Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
