/**
 * BaytMiftah REOS — QR Visitor Gate Clearance & Estate Security Kiosk
 * 
 * Terminal for security guards and estate residents to generate, scan,
 * and verify time-limited QR entry passes for guests, delivery drivers, and contractors.
 */

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  QrCode,
  KeyRound,
  UserCheck,
  Car,
  Clock,
  Phone,
  Plus,
  Share2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Building2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import {
  liveVisitorClearanceService,
  mapDbVisitorPass,
  type VisitorPass,
  type PassType,
} from '../../../lib/visitor-clearance.service';
import { estateOperationsService, type EstateUnit, type ManagedEstate } from '../../../lib/estate-operations.service';
import { useCall } from '../../context/CallContext';
import { buildWhatsAppCallUrl } from '../../../lib/call.service';
import { sendGatePassSms } from '../../../lib/sms-gateway.service';

export function GateClearanceKiosk({
  organizationId,
  currentUserId,
}: {
  organizationId?: string;
  currentUserId?: string;
}) {
  const { startCall } = useCall();
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [estateId, setEstateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'guard_kiosk' | 'generate_pass' | 'logbook'>('guard_kiosk');

  const [inputCode, setInputCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    pass?: VisitorPass;
    message: string;
  } | null>(null);

  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [passType, setPassType] = useState<PassType>('guest_visit');
  const [hostUnitId, setHostUnitId] = useState('');
  const [validHours, setValidHours] = useState('4');
  const [generatedPass, setGeneratedPass] = useState<VisitorPass | null>(null);

  const estateNameById = Object.fromEntries(estates.map((estate) => [estate.id, estate.name]));
  const unitById = Object.fromEntries(units.map((unit) => [unit.id, unit]));
  const validityOptions = passType === 'delivery'
    ? [2, 4]
    : passType === 'contractor'
      ? [4, 8, 24]
      : passType === 'resident_vehicle'
        ? [24, 48, 168]
        : [2, 4, 8, 12];

  const reloadPasses = async (ids: string[], estateNameMap: Record<string, string>, unitMap: Record<string, EstateUnit>) => {
    const rows = await liveVisitorClearanceService.listPasses(ids);
    setPasses(
      rows.map((row: any) =>
        mapDbVisitorPass(row, estateNameMap[row.estate_id] || 'Estate', unitMap[row.host_unit_id]?.identifier)
      )
    );
  };

  useEffect(() => {
    if (!organizationId) return;
    void (async () => {
      try {
        setLoading(true);
        const estateRows = await estateOperationsService.getEstates(organizationId);
        const unitRows = await estateOperationsService.getUnits(estateRows.map((estate) => estate.id));
        setEstates(estateRows);
        setUnits(unitRows);
        const firstEstate = estateRows[0]?.id || '';
        setEstateId(firstEstate);
        const nameMap = Object.fromEntries(estateRows.map((estate) => [estate.id, estate.name]));
        const unitMap = Object.fromEntries(unitRows.map((unit) => [unit.id, unit]));
        await reloadPasses(
          estateRows.map((estate) => estate.id),
          nameMap,
          unitMap
        );
      } catch (error) {
        console.error(error);
        toast.error('Unable to load live visitor passes.');
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || !estateId) {
      toast.error('Select an estate and enter a PIN or QR token.');
      return;
    }

    try {
      const result = await liveVisitorClearanceService.verifyAndCheckIn({
        estateId,
        tokenOrPin: inputCode,
        guardUserId: currentUserId,
      });
      const mapped = result.pass
        ? mapDbVisitorPass(result.pass, estateNameById[estateId] || 'Estate', unitById[result.pass.host_unit_id]?.identifier)
        : undefined;
      setVerificationResult({ success: result.success, pass: mapped, message: result.message });
      await reloadPasses(
        estates.map((estate) => estate.id),
        estateNameById,
        unitById
      );
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gate verification failed.');
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !hostUnitId || !estateId) {
      toast.error('Visitor name, host unit, and estate are required.');
      return;
    }

    try {
      const row = await liveVisitorClearanceService.createPass({
        estateId,
        hostUnitId,
        visitorName,
        visitorPhone,
        passType,
        vehiclePlate: vehiclePlate || undefined,
        validHours: parseInt(validHours, 10) || 4,
      });
      const pass = mapDbVisitorPass(row, estateNameById[estateId] || 'Estate', unitById[hostUnitId]?.identifier);
      setGeneratedPass(pass);
      await reloadPasses(
        estates.map((estate) => estate.id),
        estateNameById,
        unitById
      );
      toast.success(`Access pass created: PIN ${pass.entryPin}`);
      if (visitorPhone.trim()) {
        try {
          await sendGatePassSms(visitorPhone.trim(), pass.entryPin, pass.estateName, pass.id, organizationId);
        } catch (error) {
          toast.warning(error instanceof Error ? error.message : 'Pass saved, but SMS delivery is not configured.');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to issue a live gate pass.');
    }
  };

  const handleVoiceCallHost = (pass: VisitorPass) => {
    void startCall(
      {
        name: `${pass.hostResidentName} (${pass.hostUnitNumber})`,
        role: 'Resident Host',
        phone: pass.hostPhone,
      },
      'voice',
      {
        estateName: pass.estateName,
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              QR Visitor Gate Clearance & Kiosk
            </h1>
            <p className="text-xs text-muted-foreground">
              Instant QR passes for guests, Bolt Food/Yango delivery, security gate barcode validation, and resident voice clearance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-xl border border-border bg-input-background px-3 py-2 text-xs"
            value={estateId}
            onChange={(event) => setEstateId(event.target.value)}
          >
            {estates.length === 0 ? <option value="">No estates</option> : null}
            {estates.map((estate) => (
              <option key={estate.id} value={estate.id}>
                {estate.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => setActiveTab('generate_pass')}
            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-950/20"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Generate Visitor Pass
          </Button>
        </div>
      </div>

      {/* Live Pass Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Passes', value: passes.filter(p => p.status === 'valid').length, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Used Today', value: passes.filter(p => p.status === 'used').length, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: <UserCheck className="w-4 h-4" /> },
          { label: 'Expired', value: passes.filter(p => p.status === 'expired').length, color: 'text-red-600', bg: 'bg-red-500/10', icon: <XCircle className="w-4 h-4" /> },
          { label: 'All Time Passes', value: passes.length, color: 'text-purple-600', bg: 'bg-purple-500/10', icon: <KeyRound className="w-4 h-4" /> },
        ].map((kpi, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color} flex-shrink-0`}>{kpi.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('guard_kiosk')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'guard_kiosk'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          Guard Gate Terminal & Scanner
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generate_pass')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'generate_pass'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Generate New Pass
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logbook')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'logbook'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Gate Traffic Logbook ({passes.length})
        </button>
      </div>

      {/* ── TAB 1: Guard Gate Terminal ────────────────────────────────── */}
      {activeTab === 'guard_kiosk' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Scanner & PIN Input */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="p-6 bg-surface border-surface-border">
              <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                <QrCode className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-ink">Gate Access Validation Terminal</h3>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-ink">
                    Scan Barcode or Enter 6-Digit Pass Code:
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="e.g. 774910 or BM-GATE-774910"
                      className="font-mono text-base tracking-wider uppercase"
                      autoFocus
                    />
                    <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700 shrink-0">
                      Verify & Open Gate
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {loading ? <span>Loading live passes…</span> : <span>Enter the 6-digit PIN or pass code from the visitor pass.</span>}
                </div>
              </form>
            </Card>

            {/* Verification Result Banner */}
            {verificationResult && (
              <Card
                className={`p-5 border animate-in zoom-in-95 duration-150 ${
                  verificationResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {verificationResult.success ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">
                      {verificationResult.success ? 'ACCESS GRANTED (GATE OPEN)' : 'ACCESS DENIED'}
                    </h4>
                    <p className="text-xs mt-1">{verificationResult.message}</p>

                    {verificationResult.pass && (
                      <div className="mt-3 rounded-xl bg-surface/80 p-3 text-xs space-y-1 text-ink border border-border">
                        <p>
                          <strong>Visitor:</strong> {verificationResult.pass.visitorName}
                        </p>
                        <p>
                          <strong>Host Resident:</strong> {verificationResult.pass.hostResidentName} (
                          {verificationResult.pass.hostUnitNumber})
                        </p>
                        {verificationResult.pass.vehiclePlate && (
                          <p>
                            <strong>Vehicle:</strong> {verificationResult.pass.vehiclePlate}
                          </p>
                        )}
                        <div className="pt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVoiceCallHost(verificationResult.pass!)}
                            className="text-xs border-emerald-500/30"
                          >
                            <Phone className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            Voice Call Resident
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Quick Active Passes Feed */}
          <div className="lg:col-span-6 space-y-3">
            <Card className="p-5 bg-surface border-surface-border">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <h3 className="font-bold text-xs text-ink uppercase tracking-wider">
                  Active Verified Passes Today
                </h3>
                <span className="text-[10px] text-muted-foreground">Gate 1 West Terminal</span>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {passes.map((pass) => (
                  <div
                    key={pass.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-subtle p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-ink">{pass.visitorName}</h4>
                        <Badge
                          className={
                            pass.status === 'valid'
                              ? 'bg-emerald-500/20 text-emerald-600 border-0 text-[9px]'
                              : 'bg-slate-500/20 text-slate-400 border-0 text-[9px]'
                          }
                        >
                          {pass.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        To: {pass.hostUnitNumber} ({pass.hostResidentName}) · PIN:{' '}
                        <strong className="font-mono text-ink">{pass.entryPin}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setInputCode(pass.entryPin);
                        }}
                        className="text-[11px] py-1 h-7"
                      >
                        Auto-Fill
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVoiceCallHost(pass)}
                        className="text-[11px] py-1 h-7 text-emerald-600 dark:text-emerald-400"
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: Generate New Pass ─────────────────────────────────── */}
      {activeTab === 'generate_pass' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-6 bg-surface border-surface-border">
              <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                <Plus className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-ink">Generate Visitor QR Gate Pass</h3>
              </div>

              <form onSubmit={handleCreatePass} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-ink">Visitor / Driver Name</label>
                    <Input
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="e.g. Kwesi Mensah or Bolt Food Rider"
                      className="mt-1 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink">Visitor Phone (Optional)</label>
                    <Input
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-ink">Pass Category</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                      value={passType}
                      onChange={(e) => {
                        const nextType = e.target.value as PassType;
                        setPassType(nextType);
                        setValidHours(nextType === 'delivery' ? '2' : nextType === 'resident_vehicle' ? '24' : '4');
                      }}
                    >
                      <option value="guest_visit">Guest / Friend Visit</option>
                      <option value="delivery">Delivery (Bolt/Yango/Courier)</option>
                      <option value="contractor">Contractor / Artisan</option>
                      <option value="resident_vehicle">Resident Temporary Vehicle</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-ink">Vehicle Plate No.</label>
                    <Input
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      placeholder="e.g. GE-4891-24"
                      className="mt-1 text-xs uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-ink">Pass Validity</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                      value={validHours}
                      onChange={(e) => setValidHours(e.target.value)}
                    >
                      {validityOptions.map((hours) => (
                        <option key={hours} value={hours}>{hours} Hours</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Host Unit</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                      value={hostUnitId}
                      onChange={(e) => setHostUnitId(e.target.value)}
                      required
                    >
                      <option value="">Select host unit</option>
                      {units
                        .filter((unit) => !estateId || unit.estate_id === estateId)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.identifier}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                    <QrCode className="mr-1.5 h-4 w-4" />
                    Issue Gate Pass & Generate QR
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Generated QR Pass Preview */}
          <div className="lg:col-span-5">
            {generatedPass ? (
              <Card className="p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-emerald-500/40 text-white shadow-2xl text-center space-y-4">
                <div className="flex items-center justify-center gap-1 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  BaytMiftah Secure Gate Pass
                </div>

                {/* QR Code Visual Centerpiece */}
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-3xl bg-white p-3 shadow-inner">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-4 border-slate-950 bg-slate-950 text-white">
                    <QrCode className="h-20 w-20 text-emerald-400" />
                    <span className="font-mono text-[9px] text-slate-300 mt-1">
                      {generatedPass.qrCodeToken}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">6-Digit Backup PIN</span>
                  <p className="text-3xl font-extrabold font-mono tracking-widest text-emerald-300 mt-0.5">
                    {generatedPass.entryPin}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 p-3 text-xs space-y-1 text-slate-300 border border-white/10">
                  <p>
                    <strong>Visitor:</strong> {generatedPass.visitorName}
                  </p>
                  <p>
                    <strong>Destination:</strong> {generatedPass.hostUnitNumber} ({generatedPass.hostResidentName})
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Expires: {new Date(generatedPass.validUntil).toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  {generatedPass.visitorPhone && (
                    <a
                      href={buildWhatsAppCallUrl(
                        generatedPass.visitorPhone,
                        `Here is your BaytMiftah Gate Pass for ${generatedPass.hostUnitNumber}: PIN ${generatedPass.entryPin}. Show this to the security guard.`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Send via WhatsApp
                    </a>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground border-dashed">
                <QrCode className="h-12 w-12 opacity-30 mb-2" />
                <p className="text-xs font-medium">Fill in the form to generate a live QR pass</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Traffic Logbook ──────────────────────────────────── */}
      {activeTab === 'logbook' && (
        <Card className="p-5 bg-surface border-surface-border">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink">Estate Gate Access Logbook</h3>
              <p className="text-xs text-muted-foreground">
                Audit trail of all visitor check-ins, vehicles, and authorizing resident hosts.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {passes.length} Total Passes
            </span>
          </div>

          <div className="divide-y divide-border">
            {passes.map((pass) => (
              <div
                key={pass.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    {pass.passType === 'delivery' ? (
                      <Car className="h-5 w-5" />
                    ) : (
                      <UserCheck className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-ink">{pass.visitorName}</h4>
                      <Badge variant="outline" className="text-[9px] font-mono uppercase">
                        {pass.passType.replace('_', ' ')}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        PIN: {pass.entryPin}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Host: {pass.hostResidentName} ({pass.hostUnitNumber}) · Gate: {pass.entryGate}
                      {pass.vehiclePlate ? ` · Plate: ${pass.vehiclePlate}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>
                      Check-in:{' '}
                      {pass.checkInTime ? new Date(pass.checkInTime).toLocaleTimeString() : 'Pending'}
                    </p>
                    <p className="text-[10px]">{new Date(pass.validFrom).toLocaleDateString()}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVoiceCallHost(pass)}
                    className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs"
                  >
                    <Phone className="mr-1 h-3 w-3" />
                    Call Host
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
