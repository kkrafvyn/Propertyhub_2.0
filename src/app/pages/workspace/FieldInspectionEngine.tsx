import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import React, { useState, useEffect, useRef } from 'react';
import { OperationalQueryState, WorkspacePageShell } from '../../components/ux';
import {
  ClipboardCheck,
  Camera,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Shield,
  Gauge,
  Droplet,
  Key,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  Sparkles,
  Info,
  DollarSign,
  UserCheck,
  MapPin,
  Crosshair,
  Smartphone,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  INSPECTION_CATEGORIES,
  type InspectionCategoryKey,
  TOTAL_INSPECTION_POINTS,
} from '../../../lib/inspection-checklist.data';
import {
  inspectionSyncService,
  type FieldInspectionDraft,
  type FieldInspectionItemState,
  type InspectionCondition,
} from '../../../lib/inspection-sync.service';
import { nativePluginsService } from '../../../lib/native-plugins.service';
import { NativeCameraCapture } from '../../components/baytmiftah/NativeCameraCapture';

export function FieldInspectionEngine({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  const [drafts, setDrafts] = useState<FieldInspectionDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<FieldInspectionDraft | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<InspectionCategoryKey>('exterior_entrance');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null); // itemKey
  const [photoCaption, setPhotoCaption] = useState<string>('');

  // Signature canvas refs
  const inspectorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tenantCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingInspector, setIsDrawingInspector] = useState(false);
  const [isDrawingTenant, setIsDrawingTenant] = useState(false);

  // Load drafts on mount
  useEffect(() => {
    const localDrafts = inspectionSyncService.listLocalDrafts(organizationId);
    setDrafts(localDrafts);
    if (localDrafts.length > 0) {
      setActiveDraft(localDrafts[0]);
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Device is back online. Syncing pending inspection reports...');
      void handleSyncAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Offline mode active. All inspection data and photos will save locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [organizationId]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await inspectionSyncService.syncAllPendingQueue();
      if (res.syncedCount > 0) {
        toast.success(`Successfully synced ${res.syncedCount} inspection report(s) to cloud.`);
      }
      setDrafts(inspectionSyncService.listLocalDrafts(organizationId));
    } catch (e: any) {
      toast.error('Sync error: ' + (e?.message || 'Network unreachable'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNew = (type: FieldInspectionDraft['inspectionType'], propertyName: string, depositGHS: number) => {
    const newDraft = inspectionSyncService.createBlankInspection({
      organizationId,
      propertyName: propertyName.trim() || 'Untitled property',
      inspectorId: currentUserId,
      inspectorName: 'Field inspector',
      tenantName: '',
      tenantPhone: '',
      inspectionType: type,
      initialSecurityDepositPesewas: Math.round(depositGHS * 100),
    });

    setDrafts(inspectionSyncService.listLocalDrafts(organizationId));
    setActiveDraft(newDraft);
    setShowNewModal(false);
    toast.success(`New 150-Point ${type.replace('_', ' ').toUpperCase()} checklist ready.`);
  };

  const handleUpdateItem = (
    itemKey: string,
    updates: Partial<FieldInspectionItemState>
  ) => {
    if (!activeDraft) return;
    void nativePluginsService.hapticLight();
    const updatedItems = {
      ...activeDraft.items,
      [itemKey]: {
        ...activeDraft.items[itemKey],
        ...updates,
      },
    };

    const updatedDraft: FieldInspectionDraft = {
      ...activeDraft,
      items: updatedItems,
      syncStatus: 'pending_offline',
    };

    inspectionSyncService.saveLocalDraft(updatedDraft);
    setActiveDraft(updatedDraft);
    setDrafts(inspectionSyncService.listLocalDrafts(organizationId));
  };

  const handleAddPhotoBase64 = (itemKey: string, base64Url: string) => {
    if (!activeDraft) return;
    const currentItem = activeDraft.items[itemKey];
    const newPhoto = {
      id: `photo_${Date.now()}`,
      url: base64Url,
      timestamp: new Date().toISOString(),
      caption: photoCaption.trim() || undefined,
    };

    handleUpdateItem(itemKey, {
      photos: [...(currentItem?.photos || []), newPhoto],
    });

    setShowPhotoModal(null);
    setPhotoCaption('');
    toast.success('Inspection photo attached offline.');
  };

  const handleAddPhoto = (itemKey: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Url = e.target?.result as string;
      handleAddPhotoBase64(itemKey, base64Url);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureGPS = async () => {
    if (!activeDraft || isLocating) return;
    setIsLocating(true);
    try {
      await nativePluginsService.hapticLight();
      const loc = await nativePluginsService.getCurrentLocation();
      const updated: FieldInspectionDraft = {
        ...activeDraft,
        gpsLatitude: loc.latitude,
        gpsLongitude: loc.longitude,
        syncStatus: 'pending_offline',
      };
      inspectionSyncService.saveLocalDraft(updated);
      setActiveDraft(updated);
      await nativePluginsService.hapticSuccess();
      toast.success(`GPS Location tagged: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
    } catch (err: any) {
      await nativePluginsService.hapticError();
      toast.error('Could not capture GPS location: ' + (err?.message || 'Permission denied'));
    } finally {
      setIsLocating(false);
    }
  };

  const activeCategory = INSPECTION_CATEGORIES.find((c) => c.key === activeCategoryKey) || INSPECTION_CATEGORIES[0];
  const summary = activeDraft ? inspectionSyncService.calculateInspectionSummary(activeDraft) : null;

  // Drawing helpers for canvas signature
  const startDrawingInspector = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = inspectorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingInspector(true);
  };

  const drawInspector = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingInspector) return;
    const canvas = inspectorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#10b981';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingInspector = () => {
    if (!isDrawingInspector || !inspectorCanvasRef.current || !activeDraft) return;
    setIsDrawingInspector(false);
    const dataUrl = inspectorCanvasRef.current.toDataURL('image/png');
    const updated: FieldInspectionDraft = {
      ...activeDraft,
      inspectorSignatureUrl: dataUrl,
      inspectorSignedAt: new Date().toISOString(),
      syncStatus: 'pending_offline',
    };
    inspectionSyncService.saveLocalDraft(updated);
    setActiveDraft(updated);
  };

  const clearInspectorSignature = () => {
    const canvas = inspectorCanvasRef.current;
    if (!canvas || !activeDraft) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    const updated: FieldInspectionDraft = {
      ...activeDraft,
      inspectorSignatureUrl: undefined,
      inspectorSignedAt: undefined,
    };
    inspectionSyncService.saveLocalDraft(updated);
    setActiveDraft(updated);
  };

  const queryPhase = 'ready' as const;

  return (
    <WorkspacePageShell
      title="Field Inspection Engine"
      description="150-point offline move-in/out checklists with photo evidence, sub-meter indexing, and security deposit deductions."
      badge={
        <Badge
          variant={isOnline ? 'default' : 'secondary'}
          className="gap-1.5 px-3 py-1 font-medium bg-surface border border-surface-border text-ink"
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-500" />
              Cloud Online
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              Offline Storage Active
            </>
          )}
        </Badge>
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSyncAll()}
            disabled={isSyncing || !isOnline}
            className="gap-2 border-surface-border bg-surface text-ink hover:bg-surface-hover"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud Queue'}
          </Button>
          <Button
            onClick={() => setShowNewModal(true)}
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New Inspection
          </Button>
        </>
      }
    >
      <OperationalQueryState phase={queryPhase}>
    <div className="space-y-6">
      {/* Overall Progress Bar */}
      {activeDraft && summary && (
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-ink">Overall Checklist Progress</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {summary.passedCount} Passed
              </span>
              {summary.damagedCount > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {summary.damagedCount} Defects
                </span>
              )}
              <span className="text-ink-muted">{TOTAL_INSPECTION_POINTS} Total Points</span>
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(summary.passedCount / TOTAL_INSPECTION_POINTS) * 100}%`,
                background: summary.overallScore >= 80
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : summary.overallScore >= 50
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-ink-muted">
            <span>0 pts</span>
            <span className="font-semibold text-ink">{Math.round((summary.passedCount / TOTAL_INSPECTION_POINTS) * 100)}% complete</span>
            <span>{TOTAL_INSPECTION_POINTS} pts</span>
          </div>
        </div>
      )}

      {/* Inspection Header Card & Score Summary */}
      {activeDraft && summary && (
        <Card className="p-6 border-surface-border bg-surface shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border border-primary/20 capitalize">
                  {activeDraft.inspectionType.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-ink-muted">ID: {activeDraft.id.slice(0, 14)}...</span>

                {/* GPS Location Tagging */}
                {activeDraft.gpsLatitude && activeDraft.gpsLongitude ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    GPS: {activeDraft.gpsLatitude.toFixed(4)}, {activeDraft.gpsLongitude.toFixed(4)}
                  </Badge>
                ) : (
                  <button
                    onClick={() => void handleCaptureGPS()}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                    title="Tag current GPS coordinates"
                  >
                    <Crosshair className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? 'Locating...' : 'Tag GPS Location'}
                  </button>
                )}
              </div>
              <h2 className="text-xl font-bold text-ink mt-1">{activeDraft.propertyName}</h2>
              <p className="text-sm text-ink-secondary mt-0.5">
                Tenant: <strong>{activeDraft.tenantName || 'Pending Assignment'}</strong> - Phone: {activeDraft.tenantPhone || 'N/A'}
              </p>
            </div>

            {/* Condition Score */}
            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg border-4 ${
                summary.overallScore >= 80
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : summary.overallScore >= 50
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-red-500 text-red-600 dark:text-red-400'
              } ${summary.overallScore === 100 ? 'animate-pulse' : ''}`}>
                {summary.overallScore}%
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-secondary tracking-wider uppercase">Condition Score</p>
                <p className="text-sm font-medium text-ink">
                  {summary.passedCount}/{summary.totalItems} Points Passed
                </p>
                {summary.damagedCount > 0 ? (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {summary.damagedCount} Defect(s) flagged
                  </p>
                ) : summary.passedCount > 0 ? (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    All clear
                  </p>
                ) : null}
              </div>
            </div>

            {/* Deposit Deduction Calculation */}
            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border">
              <p className="text-xs font-semibold text-ink-secondary tracking-wider uppercase">Deposit Breakdown</p>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-ink-secondary">Initial:</span>
                <span className="font-semibold text-ink">
                  GHS {(activeDraft.initialSecurityDepositPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-red-500">
                <span>Deductions:</span>
                <span className="font-semibold">
                  - GHS {(summary.totalDeductionsPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-surface-border pt-1 mt-1 flex justify-between items-center text-sm font-bold text-primary">
                <span>Net Refund:</span>
                <span>
                  GHS {(summary.netDepositRefundPesewas / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Submetering Handover Strip */}
          <div className="mt-6 pt-4 border-t border-surface-border grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-subtle border border-surface-border rounded-lg">
              <Gauge className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-ink-secondary font-medium">ECG Electricity Index</label>
                <input
                  type="number"
                  step="0.1"
                  value={activeDraft.electricityMeterReading || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = { ...activeDraft, electricityMeterReading: val, syncStatus: 'pending_offline' as const };
                    inspectionSyncService.saveLocalDraft(updated);
                    setActiveDraft(updated);
                  }}
                  placeholder="e.g. 1450.2 kWh"
                  className="w-full bg-input-background border border-border rounded px-2 py-1 text-sm text-ink outline-none mt-0.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-subtle border border-surface-border rounded-lg">
              <Droplet className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-ink-secondary font-medium">GWCL Water Meter (m³)</label>
                <input
                  type="number"
                  step="0.1"
                  value={activeDraft.waterMeterReading || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = { ...activeDraft, waterMeterReading: val, syncStatus: 'pending_offline' as const };
                    inspectionSyncService.saveLocalDraft(updated);
                    setActiveDraft(updated);
                  }}
                  placeholder="e.g. 342.8 m³"
                  className="w-full bg-input-background border border-border rounded px-2 py-1 text-sm text-ink outline-none mt-0.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-subtle border border-surface-border rounded-lg">
              <Shield className="w-5 h-5 text-purple-500 shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-ink-secondary font-medium">Gen-Set Runtime (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={activeDraft.generatorHoursReading || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = { ...activeDraft, generatorHoursReading: val, syncStatus: 'pending_offline' as const };
                    inspectionSyncService.saveLocalDraft(updated);
                    setActiveDraft(updated);
                  }}
                  placeholder="e.g. 182.5 hrs"
                  className="w-full bg-input-background border border-border rounded px-2 py-1 text-sm text-ink outline-none mt-0.5"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Checklist Workflow Layout */}
      {activeDraft && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Category Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <Card className="p-3 border-surface-border bg-surface shadow-sm sticky top-20">
              <h3 className="text-xs font-bold text-ink-secondary uppercase px-3 py-2 tracking-wider">
                Inspection Sections ({INSPECTION_CATEGORIES.length})
              </h3>
              <div className="space-y-1">
                {INSPECTION_CATEGORIES.map((cat) => {
                  const isActive = cat.key === activeCategoryKey;
                  const catItems = cat.items.map((i) => activeDraft.items[i.key]);
                  const reviewedCount = catItems.filter((i) => i && i.condition).length;
                  const defectCount = catItems.filter((i) => i && (i.condition === 'damaged' || i.condition === 'poor' || i.condition === 'missing')).length;
                  const pct = cat.items.length > 0 ? Math.round((reviewedCount / cat.items.length) * 100) : 0;

                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategoryKey(cat.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-ink hover:bg-surface-hover border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="truncate text-xs">{cat.title}</span>
                        <div className="flex items-center gap-1">
                          {defectCount > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              isActive ? 'bg-red-400/30 text-red-100' : 'bg-red-500/10 text-red-600'
                            }`}>
                              {defectCount}!
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-surface-subtle text-ink-muted border border-surface-border'
                          }`}>
                            {reviewedCount}/{cat.items.length}
                          </span>
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className={`h-1 w-full rounded-full overflow-hidden ${
                        isActive ? 'bg-white/20' : 'bg-surface-subtle'
                      }`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isActive
                              ? 'bg-white/70'
                              : defectCount > 0 ? 'bg-amber-500' : 'bg-primary/60'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Active Checklist Items Panel */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between bg-surface border border-surface-border p-4 rounded-xl">
              <div>
                <h3 className="text-lg font-bold text-ink">{activeCategory.title}</h3>
                <p className="text-xs text-ink-secondary">{activeCategory.description}</p>
              </div>
              <Badge variant="outline" className="border-surface-border text-ink">
                {activeCategory.items.length} Checklist Items
              </Badge>
            </div>

            {/* Checklist Items List */}
            <div className="space-y-3">
              {activeCategory.items.map((def) => {
                const item = activeDraft.items[def.key];
                if (!item) return null;

                const isDefective = item.condition === 'damaged' || item.condition === 'poor' || item.condition === 'missing';

                return (
                  <Card
                    key={def.key}
                    className={`p-4 border transition ${
                      isDefective
                        ? 'border-red-500/40 bg-red-500/5'
                        : 'border-surface-border bg-surface'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-ink text-sm">{def.label}</h4>
                          {item.photos.length > 0 && (
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs">
                              {item.photos.length} Photo(s)
                            </Badge>
                          )}
                        </div>

                        {/* Condition Selector Pill */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(['excellent', 'good', 'fair', 'poor', 'damaged', 'missing'] as InspectionCondition[]).map(
                            (c) => (
                              <button
                                key={c}
                                onClick={() => handleUpdateItem(def.key, { condition: c })}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition ${
                                  item.condition === c
                                    ? c === 'excellent' || c === 'good'
                                      ? 'bg-green-600 text-white shadow-sm'
                                      : c === 'fair'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-red-600 text-white shadow-sm'
                                    : 'bg-surface-subtle text-ink-secondary border border-surface-border hover:bg-surface-hover'
                                }`}
                              >
                                {c}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Photo Attachment Button */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPhotoModal(def.key)}
                          className="gap-1.5 text-xs border-surface-border bg-surface text-ink hover:bg-surface-hover"
                        >
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          Photo Evidence ({item.photos.length})
                        </Button>
                      </div>
                    </div>

                    {/* Defect & Deposit Deduction Details */}
                    {isDefective && (
                      <div className="mt-3 pt-3 border-t border-surface-border grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-subtle p-3 rounded-lg">
                        <div>
                          <label className="text-xs font-medium text-ink-secondary">Damage Notes</label>
                          <input
                            type="text"
                            value={item.damageDescription || ''}
                            onChange={(e) => handleUpdateItem(def.key, { damageDescription: e.target.value })}
                            placeholder="e.g. Scratched paint, broken latch"
                            className="w-full bg-input-background border border-border rounded px-2.5 py-1 text-xs text-ink outline-none mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-ink-secondary">Action Required</label>
                          <NativeSelectControl
                            value={item.actionRequired}
                            onChange={(e) => handleUpdateItem(def.key, { actionRequired: e.target.value as any })}
                            className="w-full bg-input-background border border-border rounded px-2 py-1 text-xs text-ink outline-none mt-1"
                          >
                            <option value="none">None</option>
                            <option value="cleaning">Deep Cleaning</option>
                            <option value="repair">Artisan Repair</option>
                            <option value="replacement">Full Replacement</option>
                            <option value="artisan_dispatch">Dispatch Contractor MoMo</option>
                          </NativeSelectControl>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-ink-secondary">Tenant Deduction (GHS)</label>
                            <label className="flex items-center gap-1 text-[11px] text-ink-secondary cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.tenantLiability}
                                onChange={(e) => handleUpdateItem(def.key, { tenantLiability: e.target.checked })}
                                className="w-3 h-3 rounded"
                              />
                              Liable
                            </label>
                          </div>
                          <input
                            type="number"
                            step="10"
                            value={item.estimatedRepairCostPesewas ? item.estimatedRepairCostPesewas / 100 : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleUpdateItem(def.key, { estimatedRepairCostPesewas: Math.round(val * 100) });
                            }}
                            placeholder="0.00"
                            className="w-full bg-input-background border border-border rounded px-2.5 py-1 text-xs outline-none mt-1 font-semibold text-red-600 dark:text-red-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Photo Thumbnails */}
                    {item.photos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.photos.map((p) => (
                          <div key={p.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-surface-border">
                            <img src={p.url} alt="Evidence" className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                handleUpdateItem(def.key, {
                                  photos: item.photos.filter((photo) => photo.id !== p.id),
                                });
                              }}
                              className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Signature & Sign-Off Section */}
            <Card className="p-6 border-surface-border bg-surface mt-8 shadow-sm">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Digital Signatures & Handover Sign-off
              </h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                Complies with Ghana Act 220 lease handover and deposit dispute evidence standards.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Inspector Signature Pad */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                      Inspector Signature
                    </label>
                    <button
                      onClick={clearInspectorSignature}
                      className="text-xs text-ink-muted hover:text-red-500"
                    >
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={inspectorCanvasRef}
                    width={320}
                    height={140}
                    onMouseDown={startDrawingInspector}
                    onMouseMove={drawInspector}
                    onMouseUp={stopDrawingInspector}
                    onTouchStart={startDrawingInspector}
                    onTouchMove={drawInspector}
                    onTouchEnd={stopDrawingInspector}
                    className="w-full h-32 bg-input-background border border-border rounded-lg touch-none cursor-crosshair"
                  />
                  {activeDraft.inspectorSignedAt && (
                    <p className="text-[11px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Signed: {new Date(activeDraft.inspectorSignedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Tenant Ghana Card & Acknowledgement */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-semibold text-ink uppercase tracking-wider block mb-2">
                      Tenant Identity Verification
                    </label>
                    <label className="text-xs text-ink-secondary">Ghana Card PIN (NIA)</label>
                    <input
                      type="text"
                      value={activeDraft.ghanaCardNumber || ''}
                      onChange={(e) => {
                        const updated = { ...activeDraft, ghanaCardNumber: e.target.value.toUpperCase(), syncStatus: 'pending_offline' as const };
                        inspectionSyncService.saveLocalDraft(updated);
                        setActiveDraft(updated);
                      }}
                      placeholder="GHA-7XXXXXXXX-X"
                      className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none mt-1 uppercase"
                    />
                    <p className="text-[11px] text-ink-muted mt-2">
                      By signing, tenant acknowledges condition baseline and estimated repair liability.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      const updated = {
                        ...activeDraft,
                        status: 'completed' as const,
                        syncStatus: 'pending_offline' as const,
                      };
                      inspectionSyncService.saveLocalDraft(updated);
                      setActiveDraft(updated);
                      toast.success('Inspection report finalized and signed!');
                      if (isOnline) void handleSyncAll();
                    }}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    Finalize & Lock Report
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-md border-surface-border bg-surface">
          <DialogHeader>
            <DialogTitle className="text-xl text-ink">Start 150-Point Field Inspection</DialogTitle>
          </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const propName = (form.elements.namedItem('propName') as HTMLInputElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value as any;
                const deposit = parseFloat((form.elements.namedItem('deposit') as HTMLInputElement).value) || 0;
                handleCreateNew(type, propName, deposit);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Property / Unit Name</label>
                <input
                  name="propName"
                  type="text"
                  required
                  placeholder="e.g. Airport Residential 3-Bed Penthouse"
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Inspection Type</label>
                <NativeSelectControl
                  name="type"
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none"
                >
                  <option value="move_in">Move-In Handover Baseline</option>
                  <option value="move_out">Move-Out Condition & Deposit Audit</option>
                  <option value="routine">Routine Bi-Annual Assessment</option>
                  <option value="turnover">Post-Renovation Turnover</option>
                  <option value="emergency">Emergency Damage Assessment</option>
                </NativeSelectControl>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1">Security Deposit Held (GHS)</label>
                <input
                  name="deposit"
                  type="number"
                  step="100"
                  defaultValue={10000}
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 border-surface-border text-ink"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                  Create Checklist
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPhotoModal} onOpenChange={(open) => !open && setShowPhotoModal(null)}>
        <DialogContent className="max-w-sm border-surface-border bg-surface">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg text-ink">Attach Photo Evidence</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-ink-secondary mb-4">
              Stored offline automatically in base64 buffer and synced when online.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Photo Caption</label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g. Scratched wood surface, leaking valve"
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-ink outline-none"
                />
              </div>

              <div className="flex justify-center py-2">
                <NativeCameraCapture
                  label="Capture Photo Evidence"
                  size="lg"
                  onCapture={(base64Data) => {
                    handleAddPhotoBase64(showPhotoModal, base64Data);
                  }}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowPhotoModal(null)}
                className="w-full border-surface-border text-ink"
              >
                Cancel
              </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
