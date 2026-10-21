import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
/**
 * BaytMiftah REOS — Contractor MoMo Dispatch & Work Order Suite
 * 
 * Interactive job board for dispatching vetted artisans, reviewing before/after
 * photo inspection proofs, and releasing Mobile Money escrow payouts upon sign-off.
 */

import React, { useEffect, useState } from 'react';
import {
  Wrench,
  UserCheck,
  Camera,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
  Star,
  ShieldCheck,
  DollarSign,
  Phone,
  Image,
  ArrowRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  contractorDispatchService,
  type WorkOrder,
  type VettedArtisan,
  type ArtisanTrade,
} from '../../../lib/contractor-dispatch.service';
import { useCall } from '../../context/CallContext';
import { estateOperationsService, type EstateUnit, type ManagedEstate } from '../../../lib/estate-operations.service';
import { OperationalQueryState, WorkspacePageShell } from '../../components/ux';

export function ContractorWorkOrders({ organizationId, currentUserId }: { organizationId?: string; currentUserId?: string }) {
  const { startCall } = useCall();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [artisans, setArtisans] = useState<VettedArtisan[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [estateId, setEstateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'artisans'>('board');

  const [inspectionOrder, setInspectionOrder] = useState<WorkOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trade, setTrade] = useState<ArtisanTrade>('plumber');
  const [unitId, setUnitId] = useState('');
  const [priority, setPriority] = useState<WorkOrder['priority']>('high');
  const [estimatedCost, setEstimatedCost] = useState('350');
  const [selectedArtisanId, setSelectedArtisanId] = useState('');

  const reloadLive = async () => {
    if (!organizationId) return;
    const estateRows = await estateOperationsService.getEstates(organizationId);
    const estateIds = estateRows.map((estate) => estate.id);
    const unitRows = await estateOperationsService.getUnits(estateIds);
    const [liveArtisans, durableOrders] = await Promise.all([
      contractorDispatchService.getLiveArtisans(estateIds),
      contractorDispatchService.getLiveWorkOrders(estateIds),
    ]);
    const unitById = Object.fromEntries(unitRows.map((unit) => [unit.id, unit.identifier]));
    setEstates(estateRows);
    setUnits(unitRows);
    if (!estateId) setEstateId(estateRows[0]?.id || '');
    setArtisans(liveArtisans);
    setLiveOrders(durableOrders);
    setOrders(
      durableOrders.map((order: any) =>
        contractorDispatchService.mapLiveWorkOrder(
          { ...order, unit_identifier: unitById[order.unit_id] },
          estateRows.find((estate) => estate.id === order.estate_id)?.name || 'Estate'
        )
      )
    );
    if (!selectedArtisanId && liveArtisans[0]?.id) setSelectedArtisanId(liveArtisans[0].id);
  };

  const loadBoard = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      await reloadLive();
    } catch (error) {
      console.error(error);
      const message = 'Unable to load live contractor operations.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard();
  }, [organizationId]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !estateId) {
      toast.error('Title and estate are required.');
      return;
    }

    try {
      await contractorDispatchService.createLiveWorkOrder({
        estateId,
        title,
        description,
        trade,
        unitId: unitId || undefined,
        artisanId: selectedArtisanId || undefined,
        priority,
        estimatedCostGhs: parseFloat(estimatedCost) || 300,
        createdBy: currentUserId,
      });
      await reloadLive();
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      toast.success('Work order dispatched.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to dispatch work order.');
    }
  };

  const handleReleaseMoMo = async (orderId: string) => {
    try {
      const order = liveOrders.find((item) => item.id === orderId);
      const artisan = artisans.find((item) => item.id === order?.artisan_id);
      if (!order || !artisan || !currentUserId) throw new Error('A live assigned artisan and authenticated user are required.');
      if (!organizationId) throw new Error('Organization context is required for PayAngels payouts.');
      const updated = await contractorDispatchService.releaseLivePayout({
        workOrderId: order.id,
        organizationId,
        artisanId: artisan.id,
        amountGhs: Number(order.final_cost_pesewas || order.estimate_pesewas || 0) / 100,
        momoNumber: artisan.momoNumber,
        momoProvider: artisan.momoNetwork === 'Telecel Cash' ? 'telecel' : artisan.momoNetwork === 'AT Money' ? 'airteltigo' : 'mtn',
        initiatedBy: currentUserId,
      });
      setInspectionOrder(null);
      await reloadLive();
      toast.success(`PayAngels payout ${updated.momo_status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to release payout.');
    }
  };

  const handleCallArtisan = (artisan: VettedArtisan) => {
    void startCall(
      {
        name: artisan.fullName,
        role: `Artisan (${artisan.trade})`,
        phone: artisan.phone,
      },
      'voice',
      {
        estateName: estates[0]?.name,
      }
    );
  };

  const queryPhase = loadError ? 'error' : loading ? 'loading' : 'ready';

  return (
    <WorkspacePageShell
      title="Contractor MoMo Dispatch & Work Orders"
      description="Vetted artisan directory, GPS job dispatch, before/after photo inspection verification, and Mobile Money escrow releases."
      meta={
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Wrench className="h-5 w-5" />
        </div>
      }
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => void loadBoard()} disabled={loading}>
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-950/20"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Dispatch Work Order
          </Button>
        </>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadBoard()}
      >
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'New Tickets', value: orders.filter(o => o.status === 'new_ticket').length, color: 'text-rose-600', bg: 'bg-rose-500/10', icon: <AlertCircle className="w-4 h-4" /> },
          { label: 'In Progress', value: orders.filter(o => o.status === 'in_progress' || o.status === 'dispatched').length, color: 'text-amber-600', bg: 'bg-amber-500/10', icon: <Clock className="w-4 h-4" /> },
          { label: 'Pending Review', value: orders.filter(o => o.status === 'completed_pending_review').length, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: <Camera className="w-4 h-4" /> },
          { label: 'Paid via MoMo', value: orders.filter(o => o.status === 'paid_via_momo').length, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map((kpi, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
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
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'board'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle'
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          Work Orders Board ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('artisans')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            activeTab === 'artisans'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-surface-subtle'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Vetted Artisans Directory ({artisans.length})
        </button>
      </div>

      {/* ── TAB 1: Work Orders Board ─────────────────────────────────── */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: New Tickets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                New Tickets
              </span>
              <Badge variant="outline" className="text-[10px]">
                {orders.filter((o) => o.status === 'new_ticket').length}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {orders
                .filter((o) => o.status === 'new_ticket')
                .map((order) => (
                  <Card key={order.id} className="p-4 bg-surface border-surface-border space-y-2.5">
                    <div className="flex items-start justify-between">
                      <Badge className="bg-rose-500/20 text-rose-600 border-0 text-[9px]">
                        {order.priority.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-ink">
                        ₵{order.estimatedCostGhs}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-ink">{order.title}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {order.description}
                    </p>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{order.unitIdentifier}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedArtisanId(artisans[0]?.id || '');
                          setCreateModalOpen(true);
                        }}
                        className="text-[10px] h-6 px-2"
                      >
                        Assign Artisan
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                In Progress / Dispatched
              </span>
              <Badge variant="outline" className="text-[10px]">
                {orders.filter((o) => o.status === 'in_progress' || o.status === 'dispatched').length}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {orders
                .filter((o) => o.status === 'in_progress' || o.status === 'dispatched')
                .map((order) => (
                  <Card key={order.id} className="p-4 bg-surface border-surface-border space-y-2.5">
                    <div className="flex items-start justify-between">
                      <Badge className="bg-amber-500/20 text-amber-600 border-0 text-[9px]">
                        IN PROGRESS
                      </Badge>
                      <span className="font-mono text-xs font-bold text-ink">
                        ₵{order.estimatedCostGhs}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-ink">{order.title}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {order.description}
                    </p>

                    <div className="rounded-xl bg-surface-subtle p-2 text-[10px] space-y-0.5 border border-border">
                      <p>
                        <strong>Artisan:</strong> {order.artisanName}
                      </p>
                      <p className="text-muted-foreground">{order.artisanPhone}</p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{order.unitIdentifier}</span>
                      <span className="text-amber-600 font-medium">On Site</span>
                    </div>
                  </Card>
                ))}
            </div>
          </div>

          {/* Column 3: Completed Pending Review */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Inspection Review
              </span>
              <Badge variant="outline" className="text-[10px]">
                {orders.filter((o) => o.status === 'completed_pending_review').length}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {orders
                .filter((o) => o.status === 'completed_pending_review')
                .map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 bg-emerald-500/5 border-emerald-500/30 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <Badge className="bg-emerald-500 text-white border-0 text-[9px]">
                        PROOF ATTACHED
                      </Badge>
                      <span className="font-mono text-xs font-bold text-emerald-600">
                        ₵{order.finalCostGhs}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-ink">{order.title}</h4>

                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
                      <Camera className="h-3.5 w-3.5" />
                      Before & After Photos Uploaded
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setInspectionOrder(order)}
                      className="w-full bg-emerald-600 text-white hover:bg-emerald-700 text-xs mt-2"
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      Review & Release MoMo
                    </Button>
                  </Card>
                ))}
            </div>
          </div>

          {/* Column 4: Paid via MoMo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Paid via MoMo
              </span>
              <Badge variant="outline" className="text-[10px]">
                {orders.filter((o) => o.status === 'paid_via_momo').length}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {orders
                .filter((o) => o.status === 'paid_via_momo')
                .map((order) => (
                  <Card key={order.id} className="p-4 bg-surface border-surface-border space-y-2">
                    <div className="flex items-start justify-between">
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-[9px]">
                        ESCROW RELEASED
                      </Badge>
                      <span className="font-mono text-xs font-bold text-ink">
                        ₵{order.finalCostGhs || order.estimatedCostGhs}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-ink">{order.title}</h4>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      Ref: {order.payoutReference}
                    </p>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Vetted Artisans Directory ─────────────────────────── */}
      {activeTab === 'artisans' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {artisans.map((artisan) => (
            <Card key={artisan.id} className="p-5 bg-surface border-surface-border space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-xs text-ink">{artisan.fullName}</h4>
                  <Badge variant="outline" className="text-[9px] uppercase mt-1">
                    {artisan.trade.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  {artisan.rating}
                </div>
              </div>

              <div className="rounded-xl bg-surface-subtle p-3 text-xs space-y-1 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="text-ink font-mono">{artisan.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MoMo Network:</span>
                  <span className="text-ink font-semibold">{artisan.momoNetwork}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Callout Fee:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ₵{artisan.baseCalloutFeeGhs}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-muted-foreground">Completed Jobs:</span>
                  <span className="text-ink">{artisan.jobsCompleted} Verified Jobs</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-[9px]">
                  GHANA CARD VERIFIED
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCallArtisan(artisan)}
                  className="border-emerald-500/30 text-emerald-600 text-xs h-7"
                >
                  <Phone className="mr-1 h-3 w-3" />
                  Call Artisan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal: Before/After Inspection & MoMo Escrow Release ────── */}
      <Dialog open={!!inspectionOrder} onOpenChange={(open) => !open && setInspectionOrder(null)}>
        <DialogContent className="max-w-2xl gap-4 border-border bg-surface">
          <DialogHeader className="text-left space-y-0 border-b border-border pb-3">
            <div className="flex items-center gap-2 pr-8">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <DialogTitle className="text-sm font-bold text-ink">
                Work Order Inspection & MoMo Escrow Sign-Off
              </DialogTitle>
            </div>
          </DialogHeader>

          {inspectionOrder && (
            <>
            <div>
              <h4 className="font-bold text-xs text-ink">{inspectionOrder.title}</h4>
              <p className="text-xs text-muted-foreground">{inspectionOrder.description}</p>
            </div>

            {/* Before / After Photo Comparison */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-rose-600">BEFORE WORK (FAULT)</span>
                <div className="h-44 w-full rounded-2xl bg-surface-subtle overflow-hidden border border-border flex items-center justify-center">
                  {inspectionOrder.beforePhotoUrl ? (
                    <img src={inspectionOrder.beforePhotoUrl} alt="Before inspection" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No before photo attached</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-emerald-600">
                  AFTER WORK (COMPLETED REPAIR)
                </span>
                <div className="h-44 w-full rounded-2xl bg-surface-subtle overflow-hidden border border-border flex items-center justify-center">
                  {inspectionOrder.afterPhotoUrl ? (
                    <img src={inspectionOrder.afterPhotoUrl} alt="After inspection" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No after photo attached</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="rounded-2xl bg-surface-subtle p-3.5 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Artisan Labor & Callout:</span>
                <span className="font-mono text-ink">₵{inspectionOrder.laborCostGhs ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified Materials & Parts:</span>
                <span className="font-mono text-ink">₵{inspectionOrder.materialsCostGhs ?? '—'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50 font-bold">
                <span className="text-ink">Total Disbursable Amount:</span>
                <span className="font-mono text-emerald-600 text-sm">
                  ₵{inspectionOrder.finalCostGhs || inspectionOrder.estimatedCostGhs}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectionOrder(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleReleaseMoMo(inspectionOrder.id)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs shadow-md"
              >
                <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                Approve & Release MoMo Payout (₵{inspectionOrder.finalCostGhs || inspectionOrder.estimatedCostGhs})
              </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Create Work Order ─────────────────────────────────── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md border-border bg-surface">
          <DialogHeader className="text-left space-y-0 border-b border-border pb-3 mb-2">
            <div className="flex items-center gap-2 pr-8">
              <Wrench className="h-5 w-5 text-amber-500" />
              <DialogTitle className="text-sm font-bold text-ink">Dispatch Work Order Ticket</DialogTitle>
            </div>
          </DialogHeader>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-ink">Issue Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Borehole Pump Pressure Drop"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink">Detailed Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs text-ink"
                  placeholder="Describe the issue and affected components..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink">Estate</label>
                  <NativeSelectControl
                    className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                    value={estateId}
                    onChange={(e) => setEstateId(e.target.value)}
                  >
                    {estates.map((estate) => (
                      <option key={estate.id} value={estate.id}>
                        {estate.name}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink">Trade</label>
                  <NativeSelectControl
                    className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                    value={trade}
                    onChange={(e) => setTrade(e.target.value as ArtisanTrade)}
                  >
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="hvac_ac">HVAC / AC</option>
                    <option value="generator_tech">Generator Tech</option>
                    <option value="painter">Painter</option>
                  </NativeSelectControl>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink">Unit</label>
                <NativeSelectControl
                  className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                >
                  <option value="">Common area</option>
                  {units
                    .filter((unit) => !estateId || unit.estate_id === estateId)
                    .map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.identifier}
                      </option>
                    ))}
                </NativeSelectControl>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink">Priority</label>
                  <NativeSelectControl
                    className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="urgent">Urgent (Immediate)</option>
                    <option value="high">High (24h)</option>
                    <option value="medium">Medium (48h)</option>
                    <option value="low">Low</option>
                  </NativeSelectControl>
                </div>

                <div>
                  <label className="text-xs font-medium text-ink">Budget (GHS)</label>
                  <Input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="mt-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink">Assign Vetted Artisan</label>
                <NativeSelectControl
                  className="mt-1 w-full rounded-xl border border-border bg-input-background p-2 text-xs"
                  value={selectedArtisanId}
                  onChange={(e) => setSelectedArtisanId(e.target.value)}
                >
                  {artisans.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} ({a.trade}) — ★{a.rating}
                    </option>
                  ))}
                </NativeSelectControl>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 text-white hover:bg-amber-700 text-xs">
                  Dispatch & Lock Escrow
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
