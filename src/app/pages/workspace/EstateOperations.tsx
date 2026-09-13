import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Camera, Loader2, Plus, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type EstateIssue,
  type EstateChargeSchedule,
  type EstatePreventiveMaintenancePlan,
  type EstateWorkOrder,
  type EstateWorkOrderApproval,
  type EstateWorkOrderEvidence,
  type EstateWorkOrderQuote,
  type EstateUnit,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { allocateOldestFirst, summarizeEstateLedger } from "../../../lib/estate-ledger";
import type { EstateChargeRow } from "../../../lib/estate-ledger";
import { vendorService } from "../../../lib/vendor.service";
import { propertyService } from "../../../lib/property.service";
import {
  filterEstatesByPropertyScope,
  filterByPropertyScope,
  type MemberScopeProps,
  withMemberScopeDefaults,
} from "../../../lib/member-scope";
import {
  canApproveAmount,
  formatApprovalLimit,
  getApprovalLimitMinor,
  resolveWorkOrderApprovalAmountMinor,
  type MemberApprovalProfile,
} from "../../../lib/authorization.service";
import { ownerOperatorService } from "../../../lib/owner-operator.service";

interface EstateOperationsProps extends MemberScopeProps {
  organizationId: string;
  currentUserId: string;
  memberApprovalProfile?: MemberApprovalProfile | null;
}

const issueStatusLabel = (status: EstateIssue["status"]) => status.replace(/_/g, " ");
const workOrderStatusLabel = (status: EstateWorkOrder["status"]) => status.replace(/_/g, " ");
const formatMoneyIn = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amountMinor / 100);

export function EstateOperations({
  organizationId,
  currentUserId,
  memberApprovalProfile = null,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: EstateOperationsProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [schedules, setSchedules] = useState<EstateChargeSchedule[]>([]);
  const [workOrders, setWorkOrders] = useState<EstateWorkOrder[]>([]);
  const [plans, setPlans] = useState<EstatePreventiveMaintenancePlan[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState("");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState("");
  const [estateName, setEstateName] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [orgProperties, setOrgProperties] = useState<
    Array<{ id: string; address?: string | null; city?: string | null; region?: string | null }>
  >([]);
  const [unitIdentifier, setUnitIdentifier] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueCategory, setIssueCategory] = useState("maintenance");
  const [issueUnitId, setIssueUnitId] = useState("");
  const [issuePriority, setIssuePriority] = useState<EstateIssue["priority"]>("normal");
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleAmount, setScheduleAmount] = useState("");
  const [scheduleType, setScheduleType] = useState<EstateChargeSchedule["type"]>("service_charge");
  const [scheduleFrequency, setScheduleFrequency] = useState<EstateChargeSchedule["frequency"]>("monthly");
  const [paymentUnitId, setPaymentUnitId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card" | "bank_transfer" | "cash">("momo");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [evidencePath, setEvidencePath] = useState("");
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [evidenceType, setEvidenceType] = useState<"photo" | "video" | "document">("photo");
  const [planName, setPlanName] = useState("");
  const [planCategory, setPlanCategory] = useState("general");
  const [planFrequencyDays, setPlanFrequencyDays] = useState("90");
  const [planNextDueDate, setPlanNextDueDate] = useState("");
  const [planVendorId, setPlanVendorId] = useState("");
  const [workOrderVendorId, setWorkOrderVendorId] = useState("");
  const [workOrderStatus, setWorkOrderStatus] = useState<EstateWorkOrder["status"]>("open");
  const [workOrderScheduleFor, setWorkOrderScheduleFor] = useState("");
  const [workOrderEstimatedCost, setWorkOrderEstimatedCost] = useState("");
  const [workOrderActualCost, setWorkOrderActualCost] = useState("");
  const [workOrderNotes, setWorkOrderNotes] = useState("");
  const [workOrderAssignedTo, setWorkOrderAssignedTo] = useState("");
  const [approvalType, setApprovalType] = useState<EstateWorkOrderApproval["approval_type"]>("quote");
  const [approvalNote, setApprovalNote] = useState("");
  const [managementModes, setManagementModes] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      setLoading(true);
      const scope = withMemberScopeDefaults({ scopeMode, scopedPropertyIds, bypassPropertyScope });
      const estateRows = filterEstatesByPropertyScope(
        await estateOperationsService.getEstates(organizationId),
        scope.scopeMode,
        scope.scopedPropertyIds,
        scope.bypassPropertyScope,
      );
      const estateIds = estateRows.map((estate) => estate.id);
      const [unitRows, issueRows, vendorRows] = await Promise.all([
        estateOperationsService.getUnits(estateIds),
        estateOperationsService.getIssues(estateIds),
        vendorService.getVerifiedVendors("maintenance", 20).catch(() => []),
      ]);
      const [chargeRows, scheduleRows, workOrderRows, planRows] = await Promise.all([
        estateOperationsService.getCharges(unitRows.map((unit) => unit.id)),
        estateOperationsService.getChargeSchedules(estateIds),
        estateOperationsService.getWorkOrders(estateIds),
        estateOperationsService.getPreventivePlans(estateIds),
      ]);

      setEstates(estateRows);
      setUnits(unitRows);
      setIssues(issueRows);
      setCharges(chargeRows);
      setSchedules(scheduleRows);
      setWorkOrders(workOrderRows);
      setPlans(planRows);
      setVendors(vendorRows || []);
      const propertyRows = filterByPropertyScope(
        (await propertyService.getOrganizationProperties(organizationId)) || [],
        scope.scopeMode,
        scope.scopedPropertyIds,
        scope.bypassPropertyScope,
      );
      setOrgProperties(
        propertyRows.map((property) => ({
          id: property.id,
          address: property.address,
          city: property.city,
          region: property.region,
        })),
      );
      const modes = await ownerOperatorService.getModes(estateIds).catch(() => []);
      const modeMap: Record<string, string> = {};
      for (const mode of modes || []) {
        modeMap[mode.estate_id] = mode.management_mode;
      }
      setManagementModes(modeMap);
      setSelectedEstateId((current) => current || estateRows[0]?.id || "");
      setSelectedWorkOrderId((current) => current || workOrderRows[0]?.id || "");
    } catch (error) {
      console.error(error);
      toast.error("Unable to load estate operations. Apply the estate-operations migration, then try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [organizationId]);

  const selectedEstate = estates.find((estate) => estate.id === selectedEstateId) || null;
  const selectedUnits = useMemo(() => units.filter((unit) => unit.estate_id === selectedEstateId), [units, selectedEstateId]);
  const selectedIssues = useMemo(() => issues.filter((issue) => issue.estate_id === selectedEstateId), [issues, selectedEstateId]);
  const selectedSchedules = useMemo(() => schedules.filter((schedule) => schedule.estate_id === selectedEstateId), [schedules, selectedEstateId]);
  const selectedWorkOrders = useMemo(() => workOrders.filter((order) => order.estate_id === selectedEstateId), [workOrders, selectedEstateId]);
  const selectedPlans = useMemo(() => plans.filter((plan) => plan.estate_id === selectedEstateId), [plans, selectedEstateId]);
  const issueById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
  const selectedLedger = useMemo(
    () => summarizeEstateLedger(charges.filter((charge) => selectedUnits.some((unit) => unit.id === charge.unit_id))),
    [charges, selectedUnits],
  );
  const selectedWorkOrder = selectedWorkOrders.find((order) => order.id === selectedWorkOrderId) || selectedWorkOrders[0] || null;
  const selectedWorkOrderIssue = selectedWorkOrder ? issueById.get(selectedWorkOrder.issue_id) || null : null;
  const openIssues = selectedIssues.filter((issue) => !["resolved", "closed"].includes(issue.status));
  const openWorkOrders = selectedWorkOrders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const duePlans = selectedPlans.filter((plan) => plan.active);
  const formatMoney = (amountMinor = 0) =>
    new Intl.NumberFormat("en-GH", { style: "currency", currency: selectedEstate?.currency || "GHS" }).format(amountMinor / 100);
  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "Not set");
  const unitLabel = (unitId: string) => units.find((unit) => unit.id === unitId)?.identifier || "Unit";
  const vendorLabel = (vendorId?: string | null) => vendors.find((vendor) => vendor.id === vendorId)?.business_name || "Vendor";
  const topArrears = useMemo(
    () =>
      Array.from(selectedLedger.outstandingByUnit)
        .sort(([, left], [, right]) => right - left)
        .slice(0, 5),
    [selectedLedger],
  );
  const paymentUnitCharges = useMemo(() => charges.filter((charge) => charge.unit_id === paymentUnitId), [charges, paymentUnitId]);
  const selectedWorkOrderQuoteTotal = selectedWorkOrder?.quotes?.reduce((sum, quote) => sum + quote.amount_minor, 0) || 0;

  const linkedPropertyIds = useMemo(
    () => new Set(estates.map((estate) => estate.property_id).filter(Boolean) as string[]),
    [estates],
  );

  const propertyLabel = (property: { id: string; address?: string | null; city?: string | null }) => {
    const parts = [property.address, property.city].filter(Boolean);
    return parts.length ? parts.join(", ") : `Property ${property.id.slice(0, 8)}`;
  };

  const createEstate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!estateName.trim()) return;
    if (selectedPropertyId && linkedPropertyIds.has(selectedPropertyId)) {
      toast.error("This property is already linked to an estate.");
      return;
    }
    const selectedProperty = orgProperties.find((property) => property.id === selectedPropertyId);
    try {
      setSubmitting(true);
      const estate = await estateOperationsService.createEstate({
        organizationId,
        name: estateName,
        propertyId: selectedPropertyId || undefined,
        address: selectedProperty?.address || undefined,
        city: selectedProperty?.city || undefined,
        region: selectedProperty?.region || undefined,
      });
      setEstateName("");
      setSelectedPropertyId("");
      setSelectedEstateId(estate.id);
      toast.success("Estate added to BaytMiftah.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to add this estate.");
    } finally {
      setSubmitting(false);
    }
  };

  const createUnit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEstateId || !unitIdentifier.trim()) return;
    try {
      setSubmitting(true);
      await estateOperationsService.createUnit({ estateId: selectedEstateId, identifier: unitIdentifier });
      setUnitIdentifier("");
      toast.success("Unit added.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to add this unit. Unit identifiers must be unique within an estate.");
    } finally {
      setSubmitting(false);
    }
  };

  const createIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEstateId || !issueTitle.trim()) return;
    try {
      setSubmitting(true);
      await estateOperationsService.createIssue({
        estateId: selectedEstateId,
        reportedByUserId: currentUserId,
        title: issueTitle,
        category: issueCategory || "maintenance",
        unitId: issueUnitId || undefined,
        priority: issuePriority,
      });
      setIssueTitle("");
      setIssueUnitId("");
      toast.success("Issue logged and added to the audit trail.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to log this issue.");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceIssue = async (issue: EstateIssue) => {
    const nextStatus: Partial<Record<EstateIssue["status"], EstateIssue["status"]>> = {
      reported: "triaged",
      triaged: "assigned",
      assigned: "resolved",
      resolved: "closed",
      reopened: "assigned",
    };
    const status = nextStatus[issue.status];
    if (!status) return;
    try {
      setSubmitting(true);
      await estateOperationsService.updateIssueStatus(issue.id, status);
      toast.success(`Issue marked ${status.replace(/_/g, " ")}.`);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update this issue.");
    } finally {
      setSubmitting(false);
    }
  };

  const createWorkOrder = async (issue: EstateIssue) => {
    try {
      setSubmitting(true);
      await estateOperationsService.createWorkOrder({
        estateId: issue.estate_id,
        issueId: issue.id,
        createdBy: currentUserId,
      });
      toast.success("Work order created. Assign a vendor or staff member next.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create this work order.");
    } finally {
      setSubmitting(false);
    }
  };

  const createSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountMinor = Math.round(Number(scheduleAmount) * 100);
    if (!selectedEstateId || !scheduleName.trim() || !Number.isFinite(amountMinor) || amountMinor <= 0) return;
    try {
      setSubmitting(true);
      await estateOperationsService.createChargeSchedule({
        estateId: selectedEstateId,
        name: scheduleName,
        type: scheduleType,
        amountMinor,
        frequency: scheduleFrequency,
        createdBy: currentUserId,
      });
      setScheduleName("");
      setScheduleAmount("");
      toast.success("Recurring charge schedule created.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create this charge schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const runSchedule = async (schedule: EstateChargeSchedule) => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(now.getDate(), 28)).toISOString().slice(0, 10);
    try {
      setSubmitting(true);
      const created = await estateOperationsService.runChargeSchedule({ scheduleId: schedule.id, period, dueDate, createdBy: currentUserId });
      toast.success(created === 0 ? "This schedule has already run for the selected period." : `${created} unit charges created.`);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to run this charge schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const syncWorkOrderForm = (workOrder: EstateWorkOrder | null) => {
    setWorkOrderVendorId(workOrder?.vendor_id || "");
    setWorkOrderStatus(workOrder?.status || "open");
    setWorkOrderScheduleFor(workOrder?.scheduled_for ? workOrder.scheduled_for.slice(0, 16) : "");
    setWorkOrderEstimatedCost(workOrder?.estimated_cost_minor ? String(workOrder.estimated_cost_minor / 100) : "");
    setWorkOrderActualCost(workOrder?.actual_cost_minor ? String(workOrder.actual_cost_minor / 100) : "");
    setWorkOrderNotes(workOrder?.notes || "");
    setWorkOrderAssignedTo(workOrder?.assigned_to_user_id || "");
  };

  useEffect(() => {
    if (selectedWorkOrders.length === 0) return;
    const next = selectedWorkOrders.find((item) => item.id === selectedWorkOrderId) || selectedWorkOrders[0];
    if (next && next.id !== selectedWorkOrderId) {
      setSelectedWorkOrderId(next.id);
    }
    syncWorkOrderForm(next || null);
  }, [selectedWorkOrders, selectedWorkOrderId]);

  const saveWorkOrder = async () => {
    if (!selectedWorkOrder) return;
    const estimatedCostMinor = workOrderEstimatedCost ? Math.round(Number(workOrderEstimatedCost) * 100) : null;
    const actualCostMinor = workOrderActualCost ? Math.round(Number(workOrderActualCost) * 100) : null;
    const scheduledFor = workOrderScheduleFor ? new Date(workOrderScheduleFor).toISOString() : null;
    try {
      setSubmitting(true);
      await estateOperationsService.updateWorkOrder(selectedWorkOrder.id, {
        status: workOrderStatus,
        vendor_id: workOrderVendorId || null,
        assigned_to_user_id: workOrderAssignedTo || null,
        scheduled_for: scheduledFor,
        estimated_cost_minor: estimatedCostMinor,
        actual_cost_minor: actualCostMinor,
        notes: workOrderNotes || null,
      });
      toast.success("Work order updated.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update this work order.");
    } finally {
      setSubmitting(false);
    }
  };

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountMinor = Math.round(Number(paymentAmount) * 100);
    if (!paymentUnitId || !paymentReference.trim() || !Number.isFinite(amountMinor) || amountMinor <= 0) return;
    const allocation = allocateOldestFirst(paymentUnitCharges, amountMinor);
    if (allocation.unallocatedMinor > 0 || allocation.allocations.length === 0) {
      toast.error("Payment cannot exceed this unit's outstanding balance. Record a credit separately after review.");
      return;
    }
    try {
      setSubmitting(true);
      await estateOperationsService.recordEstatePayment({
        unitId: paymentUnitId,
        amountMinor,
        currency: selectedEstate?.currency || "GHS",
        method: paymentMethod,
        providerReference: paymentReference.trim(),
        recordedByUserId: currentUserId,
        allocations: allocation.allocations,
      });
      setPaymentAmount("");
      setPaymentReference("");
      toast.success("Payment recorded and allocated to the oldest open charges.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to record this payment. Check that the reference has not already been used.");
    } finally {
      setSubmitting(false);
    }
  };

  const createQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWorkOrder || !quoteAmount.trim()) return;
    const amountMinor = Math.round(Number(quoteAmount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor < 0) return;
    try {
      setSubmitting(true);
      await estateOperationsService.createWorkOrderQuote({
        workOrderId: selectedWorkOrder.id,
        vendorId: workOrderVendorId || undefined,
        amountMinor,
        currency: selectedEstate?.currency || "GHS",
        note: quoteNote,
      });
      setQuoteAmount("");
      setQuoteNote("");
      toast.success("Quote added to the work order.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save this quote.");
    } finally {
      setSubmitting(false);
    }
  };

  const addEvidence = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWorkOrder || !evidencePath.trim()) return;
    try {
      setSubmitting(true);
      await estateOperationsService.addWorkOrderEvidence({
        workOrderId: selectedWorkOrder.id,
        storagePath: evidencePath,
        mediaType: evidenceType,
        caption: evidenceCaption,
        uploadedBy: currentUserId,
      });
      setEvidencePath("");
      setEvidenceCaption("");
      toast.success("Evidence attached to the work order.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to attach evidence.");
    } finally {
      setSubmitting(false);
    }
  };

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    const frequencyDays = Number(planFrequencyDays);
    if (!selectedEstateId || !planName.trim() || !Number.isFinite(frequencyDays) || frequencyDays <= 0 || !planNextDueDate) return;
    try {
      setSubmitting(true);
      await estateOperationsService.createPreventivePlan({
        estateId: selectedEstateId,
        name: planName,
        category: planCategory,
        frequencyDays,
        nextDueDate: planNextDueDate,
        defaultVendorId: planVendorId || undefined,
        createdBy: currentUserId,
      });
      setPlanName("");
      setPlanCategory("general");
      setPlanFrequencyDays("90");
      setPlanNextDueDate("");
      setPlanVendorId("");
      toast.success("Preventive maintenance plan created.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save this preventive plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const createApprovalRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWorkOrder) return;
    try {
      setSubmitting(true);
      await estateOperationsService.createWorkOrderApproval({
        workOrderId: selectedWorkOrder.id,
        approvalType,
        requestedBy: currentUserId,
        note: approvalNote,
      });
      setApprovalNote("");
      toast.success("Approval request created.");
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create the approval request.");
    } finally {
      setSubmitting(false);
    }
  };

  const decideApproval = async (approval: EstateWorkOrderApproval, status: "approved" | "rejected") => {
    if (!selectedWorkOrder) return;

    const amountMinor = resolveWorkOrderApprovalAmountMinor({
      approvalType: approval.approval_type,
      estimatedCostMinor: selectedWorkOrder.estimated_cost_minor,
      actualCostMinor: selectedWorkOrder.actual_cost_minor,
      quoteTotalMinor: selectedWorkOrderQuoteTotal,
    });

    if (
      status === "approved" &&
      memberApprovalProfile &&
      !canApproveAmount(memberApprovalProfile, "maintenance", amountMinor)
    ) {
      toast.error(
        `Your maintenance approval limit is ${formatApprovalLimit(getApprovalLimitMinor(memberApprovalProfile, "maintenance"))}. This work order exceeds it.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      await estateOperationsService.decideWorkOrderApproval({
        approvalId: approval.id,
        status,
        decidedBy: currentUserId,
      });
      toast.success(`Approval ${status}.`);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update this approval.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Loading estate operations...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">BaytMiftah Workspace</p>
          <h1 className="text-3xl font-semibold">Estate Operations</h1>
          <p className="mt-2 text-muted-foreground">
            Manage estates as connected operating records: people, issues, bills, payments, work orders, and preventive maintenance stay linked.
          </p>
          {selectedEstateId && managementModes[selectedEstateId] ? (
            <Badge variant="outline" className="mt-2 capitalize">
              {String(managementModes[selectedEstateId]).replace(/_/g, " ")}
            </Badge>
          ) : null}
        </div>
        {estates.length > 0 ? (
          <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={selectedEstateId} onChange={(event) => setSelectedEstateId(event.target.value)}>
            {estates.map((estate) => (
              <option key={estate.id} value={estate.id}>
                {estate.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {estates.length === 0 ? (
        <Card className="max-w-xl p-6">
          <Building2 className="mb-3 h-7 w-7 text-primary" />
          <h2 className="text-xl font-semibold">Add your first estate</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with an estate, then add its units before loading occupants, charges, issues, or maintenance history.
          </p>
          <form className="mt-5 space-y-3" onSubmit={createEstate}>
            {orgProperties.length > 0 ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-secondary" htmlFor="estate-property">
                  Link to property (optional)
                </label>
                <select
                  id="estate-property"
                  className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                  value={selectedPropertyId}
                  onChange={(event) => {
                    const propertyId = event.target.value;
                    setSelectedPropertyId(propertyId);
                    const property = orgProperties.find((row) => row.id === propertyId);
                    if (property && !estateName.trim()) {
                      setEstateName(propertyLabel(property));
                    }
                  }}
                >
                  <option value="">No property link</option>
                  {orgProperties.map((property) => (
                    <option key={property.id} value={property.id} disabled={linkedPropertyIds.has(property.id)}>
                      {propertyLabel(property)}
                      {linkedPropertyIds.has(property.id) ? " (linked)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex gap-3">
              <Input value={estateName} onChange={(event) => setEstateName(event.target.value)} placeholder="Estate name" />
              <Button type="submit" disabled={submitting}>
                <Plus className="h-4 w-4" />
                Add estate
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Estate units</p>
              <p className="mt-1 text-3xl font-semibold">{selectedUnits.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">Active unit records</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Open issues</p>
              <p className="mt-1 text-3xl font-semibold">{openIssues.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">Reported, triaged, or assigned</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Open work orders</p>
              <p className="mt-1 text-3xl font-semibold">{openWorkOrders.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">Active repair jobs in flight</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Outstanding balance</p>
              <p className="mt-1 text-2xl font-semibold">{formatMoney(selectedLedger.totalOutstandingMinor)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatMoney(selectedLedger.overdueMinor)} overdue</p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr,1fr]">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Aged arrears</h2>
              <p className="mt-1 text-sm text-muted-foreground">Outstanding balances are derived from charges less payment allocations.</p>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  ["Current", selectedLedger.aging.current],
                  ["1-30 days", selectedLedger.aging.days1To30],
                  ["31-60 days", selectedLedger.aging.days31To60],
                  ["61-90 days", selectedLedger.aging.days61To90],
                  ["90+ days", selectedLedger.aging.days90Plus],
                ].map(([label, amount]) => (
                  <div key={String(label)} className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{formatMoney(Number(amount))}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Units needing follow-up</h2>
              <p className="mt-1 text-sm text-muted-foreground">Largest open balances across this workspace.</p>
              <div className="mt-4 space-y-2">
                {topArrears.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outstanding unit charges.</p>
                ) : (
                  topArrears.map(([unitId, balance]) => (
                    <div key={unitId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="font-medium">{unitLabel(unitId)}</span>
                      <span className="font-semibold">{formatMoney(balance)}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recurring charges</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create predictable service charges, rent, water, levies, and penalties, then run them once per period.
                </p>
              </div>
            </div>
            <form className="mt-5 grid gap-3 md:grid-cols-[1.5fr,1fr,1fr,1fr,auto]" onSubmit={createSchedule}>
              <Input value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} placeholder="e.g. Monthly service charge" />
              <Input value={scheduleAmount} onChange={(event) => setScheduleAmount(event.target.value)} inputMode="decimal" placeholder="Amount (GHS)" />
              <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={scheduleType} onChange={(event) => setScheduleType(event.target.value as EstateChargeSchedule["type"])}>
                <option value="service_charge">Service charge</option>
                <option value="rent">Rent</option>
                <option value="water">Water</option>
                <option value="levy">Levy</option>
                <option value="penalty">Penalty</option>
                <option value="other">Other</option>
              </select>
              <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value as EstateChargeSchedule["frequency"])}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="one_off">One-off</option>
              </select>
              <Button type="submit" variant="outline" disabled={submitting}>
                Save
              </Button>
            </form>
            <div className="mt-5 space-y-2">
              {selectedSchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recurring charges configured for this estate.</p>
              ) : (
                selectedSchedules.map((schedule) => (
                  <div key={schedule.id} className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{schedule.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {schedule.type.replace(/_/g, " ")} - {schedule.frequency} - {formatMoney(schedule.amount_minor)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => void runSchedule(schedule)} disabled={submitting || !schedule.active}>
                      Run current period
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Record a payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For cash, bank transfer, card, or mobile-money payments received outside the checkout flow. BaytMiftah allocates the amount to the oldest open unit charges first.
            </p>
            <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={recordPayment}>
              <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={paymentUnitId} onChange={(event) => setPaymentUnitId(event.target.value)}>
                <option value="">Select unit</option>
                {selectedUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.identifier}
                  </option>
                ))}
              </select>
              <Input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputMode="decimal" placeholder="Amount (GHS)" />
              <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
                <option value="momo">Mobile money</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
              <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Provider or receipt reference" />
              <Button type="submit" disabled={submitting}>
                Record payment
              </Button>
            </form>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Units</h2>
              <p className="mt-1 text-sm text-muted-foreground">Each unit has its own occupancy history and financial record.</p>
              <form className="mt-4 flex gap-3" onSubmit={createUnit}>
                <Input value={unitIdentifier} onChange={(event) => setUnitIdentifier(event.target.value)} placeholder="e.g. Block C, Unit 14" />
                <Button type="submit" variant="outline" disabled={submitting}>
                  Add unit
                </Button>
              </form>
              <div className="mt-5 space-y-2">
                {selectedUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No units added yet.</p>
                ) : (
                  selectedUnits.slice(0, 8).map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="font-medium">{unit.identifier}</span>
                      <Badge variant="outline" className="capitalize">
                        {unit.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Issue desk</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Every issue is timestamped, tracked, and can become a work order in one click.</p>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createIssue}>
                <Input value={issueTitle} onChange={(event) => setIssueTitle(event.target.value)} placeholder="Describe the issue" />
                <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={issueUnitId} onChange={(event) => setIssueUnitId(event.target.value)}>
                  <option value="">Common area / no unit</option>
                  {selectedUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.identifier}
                    </option>
                  ))}
                </select>
                <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={issuePriority} onChange={(event) => setIssuePriority(event.target.value as EstateIssue["priority"])}>
                  <option value="low">Low priority</option>
                  <option value="normal">Normal priority</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Button type="submit" variant="outline" disabled={submitting}>
                  Log issue
                </Button>
              </form>
              <div className="mt-5 space-y-2">
                {selectedIssues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No issues logged for this estate.</p>
                ) : (
                  selectedIssues.slice(0, 6).map((issue) => {
                    const breached = issue.sla_target_at && new Date(issue.sla_target_at) < new Date() && !["resolved", "closed"].includes(issue.status);
                    const order = selectedWorkOrders.find((item) => item.issue_id === issue.id);
                    return (
                      <div key={issue.id} className="flex flex-col gap-3 rounded-lg border border-border px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {issue.category} - {issue.unit_id ? unitLabel(issue.unit_id) : "Common area"} - SLA {issue.sla_target_at ? new Date(issue.sla_target_at).toLocaleString() : "pending"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={breached || issue.priority === "urgent" ? "destructive" : "outline"} className="capitalize">
                            {breached ? "SLA breached" : issueStatusLabel(issue.status)}
                          </Badge>
                          {order ? (
                            <Badge variant="outline" className="capitalize">
                              WO: {workOrderStatusLabel(order.status)}
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" disabled={submitting} onClick={() => void createWorkOrder(issue)}>
                              Create work order
                            </Button>
                          )}
                          {!["closed"].includes(issue.status) ? (
                            <Button size="sm" variant="outline" disabled={submitting} onClick={() => void advanceIssue(issue)}>
                              Advance
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Work orders</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assign vendors, schedule visits, track costs, collect evidence, and request approvals from the same screen.
                </p>
              </div>
              <Badge variant="outline">{selectedWorkOrders.length} total</Badge>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr,1.15fr]">
              <div className="space-y-2">
                {selectedWorkOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No work orders yet.</p>
                ) : (
                  selectedWorkOrders.map((workOrder) => {
                    const isSelected = workOrder.id === selectedWorkOrder?.id;
                    const issue = issueById.get(workOrder.issue_id);
                    const quoteTotal = workOrder.quotes?.reduce((sum, quote) => sum + quote.amount_minor, 0) || 0;
                    return (
                      <button
                        key={workOrder.id}
                        type="button"
                        onClick={() => setSelectedWorkOrderId(workOrder.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{issue?.title || "Work order"}</p>
                            <p className="text-xs text-muted-foreground">
                              {vendorLabel(workOrder.vendor_id)} - {workOrder.scheduled_for ? formatDate(workOrder.scheduled_for) : "Not scheduled"}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {workOrderStatusLabel(workOrder.status)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{workOrder.quotes?.length || 0} quotes</span>
                          <span>{workOrder.evidence?.length || 0} evidence items</span>
                          <span>{formatMoney(workOrder.estimated_cost_minor || 0)} est.</span>
                          <span>{quoteTotal > 0 ? `${formatMoney(quoteTotal)} quoted` : "No quote total"}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedWorkOrder ? (
                <div className="space-y-4 rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{selectedWorkOrderIssue?.title || "Work order"}</h3>
                      <p className="text-sm text-muted-foreground">Use this panel to keep the job moving without jumping across screens.</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {workOrderStatusLabel(selectedWorkOrder.status)}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={workOrderVendorId} onChange={(event) => setWorkOrderVendorId(event.target.value)}>
                      <option value="">Assign verified vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business_name}
                        </option>
                      ))}
                    </select>
                    <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={workOrderStatus} onChange={(event) => setWorkOrderStatus(event.target.value as EstateWorkOrder["status"])}>
                      <option value="open">Open</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <Input value={workOrderScheduleFor} onChange={(event) => setWorkOrderScheduleFor(event.target.value)} type="datetime-local" />
                    <Input value={workOrderAssignedTo} onChange={(event) => setWorkOrderAssignedTo(event.target.value)} placeholder="Assigned staff user ID" />
                    <Input value={workOrderEstimatedCost} onChange={(event) => setWorkOrderEstimatedCost(event.target.value)} inputMode="decimal" placeholder="Estimated cost (GHS)" />
                    <Input value={workOrderActualCost} onChange={(event) => setWorkOrderActualCost(event.target.value)} inputMode="decimal" placeholder="Actual cost (GHS)" />
                  </div>
                  <Input value={workOrderNotes} onChange={(event) => setWorkOrderNotes(event.target.value)} placeholder="Notes, access details, or job instructions" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveWorkOrder()} disabled={submitting}>
                      Save work order
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void estateOperationsService
                          .updateWorkOrder(selectedWorkOrder.id, {
                            status: "completed",
                            actual_cost_minor: workOrderActualCost ? Math.round(Number(workOrderActualCost) * 100) : selectedWorkOrder.actual_cost_minor,
                          })
                          .then(() => refresh())
                      }
                      disabled={submitting}
                    >
                      Mark complete
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Vendor</p>
                      <p className="mt-1 font-medium">{vendorLabel(selectedWorkOrder.vendor_id)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p className="mt-1 font-medium">{formatDate(selectedWorkOrder.scheduled_for)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Estimated / actual</p>
                      <p className="mt-1 font-medium">
                        {formatMoney(selectedWorkOrder.estimated_cost_minor || 0)} / {formatMoney(selectedWorkOrder.actual_cost_minor || 0)}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Quotes total</p>
                      <p className="mt-1 font-medium">{formatMoney(selectedWorkOrderQuoteTotal)}</p>
                    </Card>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Approvals</h4>
                    </div>
                    <form className="mt-3 grid gap-3 md:grid-cols-[1fr,1fr,auto]" onSubmit={createApprovalRequest}>
                      <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={approvalType} onChange={(event) => setApprovalType(event.target.value as EstateWorkOrderApproval["approval_type"])}>
                        <option value="quote">Quote</option>
                        <option value="budget">Budget</option>
                        <option value="completion">Completion</option>
                        <option value="chargeable_cost">Chargeable cost</option>
                      </select>
                      <Input value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} placeholder="Approval note" />
                      <Button type="submit" variant="outline" disabled={submitting}>
                        Request approval
                      </Button>
                    </form>
                    <div className="mt-3 space-y-2">
                      {(selectedWorkOrder.approvals || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No approvals yet.</p>
                      ) : (
                        selectedWorkOrder.approvals?.map((approval) => {
                          const amountMinor = resolveWorkOrderApprovalAmountMinor({
                            approvalType: approval.approval_type,
                            estimatedCostMinor: selectedWorkOrder.estimated_cost_minor,
                            actualCostMinor: selectedWorkOrder.actual_cost_minor,
                            quoteTotalMinor: selectedWorkOrderQuoteTotal,
                          });
                          const canApprove = memberApprovalProfile
                            ? canApproveAmount(memberApprovalProfile, "maintenance", amountMinor)
                            : true;

                          return (
                          <div key={approval.id} className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium capitalize">{approval.approval_type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">{approval.note || "No note added"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {approval.status}
                              </Badge>
                              {approval.status === "pending" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void decideApproval(approval, "approved")}
                                    disabled={submitting || !canApprove}
                                    title={
                                      !canApprove
                                        ? `Exceeds your limit (${formatApprovalLimit(memberApprovalProfile ? getApprovalLimitMinor(memberApprovalProfile, "maintenance") : 0)})`
                                        : undefined
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => void decideApproval(approval, "rejected")} disabled={submitting}>
                                    Reject
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Evidence</h4>
                    </div>
                    <form className="mt-3 grid gap-3 md:grid-cols-[1fr,1fr,1fr,auto]" onSubmit={addEvidence}>
                      <Input value={evidencePath} onChange={(event) => setEvidencePath(event.target.value)} placeholder="Storage path or file reference" />
                      <Input value={evidenceCaption} onChange={(event) => setEvidenceCaption(event.target.value)} placeholder="Caption" />
                      <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as "photo" | "video" | "document")}>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                      </select>
                      <Button type="submit" variant="outline" disabled={submitting}>
                        Add evidence
                      </Button>
                    </form>
                    <div className="mt-3 space-y-2">
                      {(selectedWorkOrder.evidence || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No evidence attached.</p>
                      ) : (
                        selectedWorkOrder.evidence?.map((item: EstateWorkOrderEvidence) => (
                          <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                            <p className="font-medium capitalize">{item.media_type}</p>
                            <p className="text-xs text-muted-foreground">{item.caption || item.storage_path}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Quotes</h4>
                    </div>
                    <form className="mt-3 grid gap-3 md:grid-cols-[1fr,1fr,auto]" onSubmit={createQuote}>
                      <Input value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} inputMode="decimal" placeholder="Quote amount (GHS)" />
                      <Input value={quoteNote} onChange={(event) => setQuoteNote(event.target.value)} placeholder="Quote note" />
                      <Button type="submit" variant="outline" disabled={submitting}>
                        Add quote
                      </Button>
                    </form>
                    <div className="mt-3 space-y-2">
                      {(selectedWorkOrder.quotes || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No quotes recorded.</p>
                      ) : (
                        selectedWorkOrder.quotes?.map((quote: EstateWorkOrderQuote) => (
                          <div key={quote.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                              <p className="font-medium">{formatMoney(quote.amount_minor)}</p>
                              <p className="text-xs text-muted-foreground">{quote.note || vendorLabel(quote.vendor_id)}</p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {quote.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  Select a work order to edit its vendor, evidence, approvals, and schedule.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preventive maintenance</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep recurring inspections and upkeep visible before they become expensive work orders.
                </p>
              </div>
              <Badge variant="outline">{duePlans.length} active plans</Badge>
            </div>
            <form className="mt-5 grid gap-3 md:grid-cols-[1.2fr,1fr,0.8fr,1fr,1fr,auto]" onSubmit={createPlan}>
              <Input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="e.g. Fire alarm testing" />
              <Input value={planCategory} onChange={(event) => setPlanCategory(event.target.value)} placeholder="Category" />
              <Input value={planFrequencyDays} onChange={(event) => setPlanFrequencyDays(event.target.value)} inputMode="numeric" placeholder="Every N days" />
              <Input value={planNextDueDate} onChange={(event) => setPlanNextDueDate(event.target.value)} type="date" />
              <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={planVendorId} onChange={(event) => setPlanVendorId(event.target.value)}>
                <option value="">Default vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.business_name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" disabled={submitting}>
                Save plan
              </Button>
            </form>
            <div className="mt-5 space-y-2">
              {selectedPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No preventive plans yet.</p>
              ) : (
                selectedPlans.map((plan) => (
                  <div key={plan.id} className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.category} - every {plan.frequency_days} days - next due {formatDate(plan.next_due_date)} - vendor {vendorLabel(plan.default_vendor_id)}
                      </p>
                    </div>
                    <Badge variant={plan.active ? "outline" : "secondary"}>{plan.active ? "Active" : "Paused"}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Finance and notices are next</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The data foundation already enforces immutable charges, payment allocations, delivery receipts, and per-unit access. The next workspace screens will expose statements, arrears,
                  payment reconciliation, and notice delivery.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
