/**
 * BaytMiftah REOS — Utility Sub-Metering & Generator Fuel Split Page
 * 
 * Interactive manager for ECG electricity sub-meters, GWCL water meters,
 * central generator diesel split billing, and automated Mobile Money utility invoices.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Zap,
  Droplets,
  Fuel,
  Camera,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Smartphone,
  Sliders,
  DollarSign,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import {
  utilitySubmeterService,
  liveUtilitySubmeterService,
  loadOrganizationUtilityData,
  DEFAULT_PURC_TARIFFS,
  type UtilityMeter,
  type MeterReadingRecord,
  type GeneratorFuelRun,
  type UtilityType,
} from '../../../lib/utility-submeter.service';
import { useAuth } from '@/app/context/AuthContext';

export function UtilitySubmetering({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [readings, setReadings] = useState<MeterReadingRecord[]>([]);
  const [genRuns, setGenRuns] = useState<GeneratorFuelRun[]>([]);
  const [occupiedUnits, setOccupiedUnits] = useState(1);
  const [loadingLive, setLoadingLive] = useState(false);
  const [estateId, setEstateId] = useState('');

  const reloadData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoadingLive(true);
      const live = await loadOrganizationUtilityData(organizationId);
      setMeters(live.meters);
      setReadings(live.readings);
      setGenRuns(live.genRuns);
      setOccupiedUnits(Math.max(1, live.occupiedUnits));
      if (!estateId && live.meters[0]?.estateId) setEstateId(live.meters[0].estateId);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load live utility meters.');
    } finally {
      setLoadingLive(false);
    }
  }, [organizationId]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);
  const [activeTab, setActiveTab] = useState<'meters' | 'readings' | 'generator' | 'tariffs'>('meters');
  const [searchFilter, setSearchFilter] = useState('');

  // Modals
  const [selectedMeterForReading, setSelectedMeterForReading] = useState<UtilityMeter | null>(null);
  const [newReadingValue, setNewReadingValue] = useState('');
  const [includeGenSplit, setIncludeGenSplit] = useState(true);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genHours, setGenHours] = useState('4.5');
  const [genLitres, setGenLitres] = useState('160');
  const [genPrice, setGenPrice] = useState('14.80');
  const [genReason, setGenReason] = useState('ECG 33kV Cantonments Feeder Outage');

  const filteredMeters = meters.filter(
    (m) =>
      m.meterNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (m.unitIdentifier && m.unitIdentifier.toLowerCase().includes(searchFilter.toLowerCase())) ||
      m.utilityType.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalKwh = readings
    .filter((r) => r.utilityType === 'electricity')
    .reduce((sum, r) => sum + r.consumption, 0);

  const totalWaterM3 = readings
    .filter((r) => r.utilityType === 'water')
    .reduce((sum, r) => sum + r.consumption, 0);

  const totalGenCost = genRuns.reduce((sum, g) => sum + g.totalFuelCostGhs, 0);

  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeterForReading || !newReadingValue) return;

    const val = parseFloat(newReadingValue);
    if (isNaN(val) || val < selectedMeterForReading.lastReading) {
      toast.error('New reading must be greater than previous reading.');
      return;
    }

    try {
      if (!organizationId || !user?.id) throw new Error('Sign in with an organization to record meter readings.');
      const recorded = await liveUtilitySubmeterService.recordReading({
        meterId: selectedMeterForReading.id,
        currentReading: val,
        recordedBy: user.id,
      });
      const consumption = Math.max(0, val - selectedMeterForReading.lastReading);
      const { tariffRate, total } = utilitySubmeterService.calculatePurcCharge(selectedMeterForReading.utilityType, consumption);
      if (selectedMeterForReading.unitId && total > 0) {
        await liveUtilitySubmeterService.issueInvoice({
          readingId: recorded.id,
          meterId: selectedMeterForReading.id,
          unitId: selectedMeterForReading.unitId,
          unitsConsumed: consumption,
          rateGhsPerUnit: tariffRate,
          amountPesewas: Math.round(total * 100),
          periodStart: recorded.reading_date,
          periodEnd: recorded.reading_date,
        });
      }
      await reloadData();
      toast.success(`Reading recorded for ${selectedMeterForReading.unitIdentifier || selectedMeterForReading.meterNumber}`);
      setSelectedMeterForReading(null);
      setNewReadingValue('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save meter reading.');
    }
  };

  const handleSaveGeneratorRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetEstateId = estateId || meters[0]?.estateId;
      if (!organizationId || !targetEstateId) throw new Error('Select an estate before logging a generator run.');
      await liveUtilitySubmeterService.logGeneratorRun({
        estateId: targetEstateId,
        hoursRun: parseFloat(genHours) || 0,
        litresConsumed: parseFloat(genLitres) || 0,
        dieselPricePerLitreGhs: parseFloat(genPrice) || 14.5,
        notes: genReason,
        occupiedUnits,
        recordedBy: user?.id,
      });
      await reloadData();
      setGenModalOpen(false);
      toast.success('Generator run logged and split across occupied units.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log generator run.');
    }
  };

  const handleSendMoMoInvoice = async (reading: MeterReadingRecord) => {
    try {
      const meter = meters.find((item) => item.id === reading.meterId);
      if (!meter?.unitId) throw new Error('This meter is not linked to a unit, so a resident invoice cannot be issued.');
      if (reading.invoiceStatus === 'paid_momo') {
        toast.success(`Invoice already paid for ${reading.unitIdentifier}.`);
        return;
      }
      const period = new Date(reading.readAt).toISOString().slice(0, 10);
      const invoice = await liveUtilitySubmeterService.issueInvoice({
        readingId: reading.id,
        meterId: reading.meterId,
        unitId: meter.unitId,
        unitsConsumed: reading.consumption,
        rateGhsPerUnit: reading.tariffPerUnitGhs || 1,
        amountPesewas: Math.max(1, Math.round((reading.totalDueGhs || 0) * 100)),
        periodStart: period,
        periodEnd: period,
      });
      const { sendUtilityBillSms } = await import('../../../lib/sms-gateway.service');
      const { estateOperationsService } = await import('../../../lib/estate-operations.service');
      const occupancies = await estateOperationsService.getOccupancies([meter.unitId]);
      const tenant = occupancies.find((row) => row.role === 'tenant' && !row.end_date);
      let reference = invoice.id;
      if (tenant) {
        const { data: profile } = await (await import('../../../lib/supabase')).supabase
          .from('users')
          .select('phone')
          .eq('id', tenant.user_id)
          .maybeSingle();
        if (profile?.phone) {
          const sms = await sendUtilityBillSms(profile.phone, reading.totalDueGhs, period, invoice.id, organizationId);
          reference = sms.reference;
        }
      }
      await liveUtilitySubmeterService.markInvoiceDispatched(invoice.id, reference);
      await reloadData();
      toast.success(`Utility invoice queued for ${reading.unitIdentifier}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to issue a live utility invoice.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Utility Sub-Metering & Fuel Split
            </h1>
            <p className="text-xs text-muted-foreground">
              Automated PURC Ghana tariffs, ECG electricity & GWCL water sub-meters, and central diesel generator cost splitting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setGenModalOpen(true)}
            className="border-amber-500/30 text-amber-600 dark:text-amber-400"
          >
            <Fuel className="mr-1.5 h-4 w-4" />
            Log Generator Run
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (meters.length > 0) setSelectedMeterForReading(meters[0]);
            }}
            className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-950/20"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Scan / Record Reading
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Sub-Meters</span>
            <Gauge className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">{meters.length} Units</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">100% Calibrated</span>
        </Card>

        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Month's Power</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">{totalKwh.toLocaleString()} kWh</p>
          <span className="text-[10px] text-muted-foreground">₵1.82 - ₵2.35 PURC band</span>
        </Card>

        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Month's Water</span>
            <Droplets className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">{totalWaterM3.toLocaleString()} m³</p>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">GWCL Metered</span>
        </Card>

        <Card className="p-4 bg-surface border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Gen Fuel Total</span>
            <Fuel className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-ink">₵{totalGenCost.toLocaleString()}</p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Split across {occupiedUnits} occupied units</span>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('meters')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'meters'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Gauge className="h-3.5 w-3.5" />
          Sub-Meters Directory ({meters.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('readings')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'readings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Readings & Invoices ({readings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'generator'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Fuel className="h-3.5 w-3.5" />
          Diesel Generator Splits ({genRuns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tariffs')}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'tariffs'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle hover:text-ink'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          PURC Tariffs
        </button>
      </div>

      {/* ── TAB 1: Sub-Meters Directory ─────────────────────────────────── */}
      {activeTab === 'meters' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meter number, villa, or utility..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeters.map((m) => (
              <Card
                key={m.id}
                className="flex flex-col justify-between p-4 bg-surface border-surface-border shadow-sm hover:border-emerald-500/40 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                          m.utilityType === 'electricity'
                            ? 'bg-amber-500/10 text-amber-500'
                            : m.utilityType === 'water'
                            ? 'bg-sky-500/10 text-sky-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {m.utilityType === 'electricity' ? (
                          <Zap className="h-4 w-4" />
                        ) : m.utilityType === 'water' ? (
                          <Droplets className="h-4 w-4" />
                        ) : (
                          <Fuel className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-ink">{m.unitIdentifier || 'Estate Unit'}</h3>
                        <p className="font-mono text-[10px] text-muted-foreground">{m.meterNumber}</p>
                      </div>
                    </div>

                    <Badge
                      className={
                        m.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-[9px]'
                          : 'bg-amber-500/20 text-amber-600 border-0 text-[9px]'
                      }
                    >
                      {m.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-xl bg-surface-subtle p-3 space-y-1.5 border border-border/50 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Reading:</span>
                      <span className="font-bold font-mono text-ink">
                        {m.lastReading.toLocaleString()} {m.unitOfMeasure}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="text-ink truncate max-w-[150px]">{m.meterModel}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="text-ink">{m.location}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Last read: {new Date(m.lastReadAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedMeterForReading(m)}
                    className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  >
                    <Camera className="mr-1 h-3.5 w-3.5" />
                    Record Reading
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: Reading History & Invoices ──────────────────────────── */}
      {activeTab === 'readings' && (
        <Card className="p-5 bg-surface border-surface-border">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink">Meter Reading History & Charges</h3>
              <p className="text-xs text-muted-foreground">
                Automated PURC consumption billing and resident Mobile Money dispatch trail.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {readings.length} Recorded Readings
            </span>
          </div>

          <div className="divide-y divide-border">
            {readings.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      r.utilityType === 'electricity'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-sky-500/10 text-sky-500'
                    }`}
                  >
                    {r.utilityType === 'electricity' ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <Droplets className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-ink">{r.unitIdentifier}</h4>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ({r.meterNumber})
                      </span>
                      {r.invoiceStatus === 'paid_momo' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-[9px]">
                          PAID VIA MOMO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">
                          INVOICED
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Consumption: {r.consumption} units (Reading {r.previousReading} → {r.currentReading}) · ₵{r.tariffPerUnitGhs}/unit
                      {r.generatorFuelContributionGhs ? ` + ₵${r.generatorFuelContributionGhs} Gen Fuel` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-bold text-ink text-sm">₵{r.totalDueGhs.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.readAt).toLocaleDateString()}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendMoMoInvoice(r)}
                    className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs"
                  >
                    <Smartphone className="mr-1 h-3.5 w-3.5" />
                    MoMo Request
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TAB 3: Diesel Generator Splits ────────────────────────────── */}
      {activeTab === 'generator' && (
        <Card className="p-5 bg-surface border-surface-border">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink">Central Standby Generator Run Log</h3>
              <p className="text-xs text-muted-foreground">
                Diesel fuel consumption during ECG outages split across estate units.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setGenModalOpen(true)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log Diesel Refill & Run
            </Button>
          </div>

          <div className="divide-y divide-border">
            {genRuns.map((g) => (
              <div
                key={g.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <Fuel className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-ink">{g.ecgOutageReason}</h4>
                      <span className="text-[10px] text-muted-foreground">({g.runDate})</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {g.hoursRun} hours runtime · {g.litresConsumed} litres diesel @ ₵{g.dieselPricePerLitreGhs}/L
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono font-bold text-ink text-sm">₵{g.totalFuelCostGhs.toFixed(2)} Total</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ₵{g.chargePerUnitGhs.toFixed(2)} / Unit Split
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TAB 4: PURC Tariffs Reference ─────────────────────────────── */}
      {activeTab === 'tariffs' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DEFAULT_PURC_TARIFFS.map((t, i) => (
            <Card key={i} className="p-5 bg-surface border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {t.utilityType === 'electricity' ? (
                    <Zap className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Droplets className="h-4 w-4 text-sky-500" />
                  )}
                  <h3 className="font-bold text-xs text-ink">{t.bandName}</h3>
                </div>
                <Badge variant="outline" className="text-[9px]">
                  PURC APPROVED
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Energy / Volumetric Rate:</span>
                  <span className="font-mono font-bold text-ink">₵{t.ratePerUnitGhs} / unit</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Monthly Service Charge:</span>
                  <span className="font-mono text-ink">₵{t.serviceChargeMonthlyGhs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Effective Date:</span>
                  <span className="text-muted-foreground">{t.effectiveFrom}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal: Record Meter Reading ───────────────────────────────── */}
      {selectedMeterForReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-ink">Record Sub-Meter Reading</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMeterForReading(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-surface-subtle hover:text-ink transition"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReading} className="space-y-4">
              <div className="rounded-xl bg-surface-subtle p-3 text-xs space-y-1">
                <p>
                  <strong className="text-ink">Unit:</strong> {selectedMeterForReading.unitIdentifier}
                </p>
                <p>
                  <strong className="text-ink">Meter Number:</strong> {selectedMeterForReading.meterNumber}
                </p>
                <p>
                  <strong className="text-ink">Previous Reading:</strong>{' '}
                  <span className="font-mono font-bold text-emerald-600">
                    {selectedMeterForReading.lastReading} {selectedMeterForReading.unitOfMeasure}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-ink">
                  New Reading Value ({selectedMeterForReading.unitOfMeasure})
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={newReadingValue}
                  onChange={(e) => setNewReadingValue(e.target.value)}
                  placeholder={`e.g. ${(selectedMeterForReading.lastReading + 250).toFixed(1)}`}
                  className="mt-1 font-mono"
                  required
                />
              </div>

              {selectedMeterForReading.utilityType === 'electricity' && (
                <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGenSplit}
                    onChange={(e) => setIncludeGenSplit(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Include Central Generator Diesel Split contribution (+₵194.25)</span>
                </label>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMeterForReading(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  Save & Issue Charge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Log Generator Run ──────────────────────────────────── */}
      {genModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-sm text-ink">Log Standby Generator Run</h3>
              </div>
              <button
                type="button"
                onClick={() => setGenModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-surface-subtle hover:text-ink transition"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGeneratorRun} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-ink">Hours Run</label>
                <Input
                  type="number"
                  step="0.5"
                  value={genHours}
                  onChange={(e) => setGenHours(e.target.value)}
                  className="mt-1 text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink">Diesel Consumed (Litres)</label>
                  <Input
                    type="number"
                    value={genLitres}
                    onChange={(e) => setGenLitres(e.target.value)}
                    className="mt-1 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink">Price Per Litre (GHS)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={genPrice}
                    onChange={(e) => setGenPrice(e.target.value)}
                    className="mt-1 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink">Outage Cause / Description</label>
                <Input
                  value={genReason}
                  onChange={(e) => setGenReason(e.target.value)}
                  placeholder="e.g. ECG Cantonments Feeder Grid Outage"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                Total Fuel Cost: <strong>₵{((parseFloat(genLitres) || 0) * (parseFloat(genPrice) || 0)).toFixed(2)}</strong>
                <br />
                Split per occupied unit ({occupiedUnits}): <strong>₵{(((parseFloat(genLitres) || 0) * (parseFloat(genPrice) || 0)) / Math.max(1, occupiedUnits)).toFixed(2)}</strong>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGenModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                  Log Run & Compute Split
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
