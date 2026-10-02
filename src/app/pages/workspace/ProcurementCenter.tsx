import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { ArrowRight, CheckCircle2, ClipboardList, Loader2, PackagePlus, ReceiptText, Send, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { DesktopOnlyGate } from "@/app/context/SurfaceContext";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/badge";
import { organizationService } from "@/lib/organization.service";
import { estateOperationsService, type ManagedEstate } from "@/lib/estate-operations.service";
import { estatePayablesService } from "@/lib/estate-payables.service";
import { invoiceMatchingService, type ProcurementInvoiceMatch } from "@/lib/invoice-matching.service";
import { procurementWorkflowService, type ProcurementRequest, type PurchaseOrder } from "@/lib/procurement-workflow.service";

const money = (amount = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amount / 100);

type ProcurementCenterProps = {
  organizationId?: string;
  currentUserId?: string;
};

type PendingInvoiceMatch = {
  billId: string;
  tolerance: string;
};

type VendorBillOption = {
  id: string;
  bill_number: string;
  amount_minor: number;
  status: string;
};

export function ProcurementCenter({ organizationId, currentUserId }: ProcurementCenterProps) {
  const { user } = useAuth();
  const { organizationSlug } = useParams();

  const [resolvedOrganizationId, setResolvedOrganizationId] = useState(organizationId || "");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingOrg, setResolvingOrg] = useState(!organizationId && !!organizationSlug);
  const [error, setError] = useState("");

  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [estateId, setEstateId] = useState("");

  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    amount: "",
  });
  const [poForm, setPoForm] = useState({
    requestId: "",
    vendorName: "",
    poNumber: "",
    amount: "",
  });
  const [receiptForm, setReceiptForm] = useState<Record<string, { reference: string; notes: string }>>({});
  const [invoiceMatch, setInvoiceMatch] = useState<PendingInvoiceMatch>({ billId: "", tolerance: "0" });
  const [billForm, setBillForm] = useState({ poId: "", billNumber: "", amount: "", dueDate: "" });
  const [matchResult, setMatchResult] = useState<ProcurementInvoiceMatch | null>(null);
  const [vendorBills, setVendorBills] = useState<VendorBillOption[]>([]);
  const [pendingMatches, setPendingMatches] = useState<ProcurementInvoiceMatch[]>([]);

  const actorId = currentUserId || user?.id || "";
  const currency = estates[0]?.currency || "GHS";

  useEffect(() => {
    let cancelled = false;

    if (organizationId) {
      setResolvedOrganizationId(organizationId);
      setResolvingOrg(false);
      setError("");
      return () => {
        cancelled = true;
      };
    }

    if (!organizationSlug) {
      setResolvedOrganizationId("");
      setResolvingOrg(false);
      setError("Open procurement from a workspace to load live estate data.");
      return () => {
        cancelled = true;
      };
    }

    setResolvingOrg(true);
    void (async () => {
      try {
        const organization = await organizationService.getOrganizationBySlug(organizationSlug);
        if (cancelled) return;
        setResolvedOrganizationId(organization.id);
        setOrganizationName(organization.name);
        setError("");
      } catch (failure: any) {
        if (!cancelled) {
          setResolvedOrganizationId("");
          setOrganizationName("");
          setError(failure?.message || "We could not resolve this organization.");
        }
      } finally {
        if (!cancelled) setResolvingOrg(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, organizationSlug]);

  const load = async () => {
    if (!resolvedOrganizationId) return;
    try {
      setLoading(true);
      const estateRows = await estateOperationsService.getEstates(resolvedOrganizationId);
      setEstates(estateRows);
      setEstateId((current) => current || estateRows[0]?.id || "");

      const estateIds = estateRows.map((estate) => estate.id);
      const [requestRows, orderRows, billRows, reviewRows] = await Promise.all([
        procurementWorkflowService.listRequests(estateIds),
        procurementWorkflowService.listPurchaseOrders(estateIds),
        estatePayablesService.getBills(estateIds),
        invoiceMatchingService.getPendingReview(resolvedOrganizationId),
      ]);

      setRequests(requestRows);
      setOrders(orderRows);
      setVendorBills(
        (billRows as any[]).map((bill) => ({
          id: bill.id,
          bill_number: bill.bill_number,
          amount_minor: bill.amount_minor,
          status: bill.status,
        }))
      );
      setPendingMatches(reviewRows);
      if (!invoiceMatch.billId && billRows.length > 0) {
        setInvoiceMatch((current) => ({ ...current, billId: (billRows as any[])[0].id }));
      }
      if (!poForm.requestId && requestRows.length > 0) {
        const firstApproved = requestRows.find((request) => request.status === "approved") || requestRows[0];
        if (firstApproved) {
          setPoForm((current) => ({
            ...current,
            requestId: current.requestId || firstApproved.id,
            amount: current.amount || String((firstApproved.amount_minor || 0) / 100),
          }));
        }
      }
    } catch (failure: any) {
      console.error(failure);
      toast.error(failure?.message || "Unable to load procurement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrganizationId]);

  const scopedRequests = requests.filter((request) => request.estate_id === estateId);
  const scopedOrders = orders.filter((order) => order.estate_id === estateId);
  const selectedEstate = estates.find((estate) => estate.id === estateId);
  const selectedRequest = scopedRequests.find((request) => request.id === poForm.requestId);
  const requestStats = {
    requested: scopedRequests.filter((item) => item.status === "requested").length,
    approved: scopedRequests.filter((item) => item.status === "approved").length,
    ordered: scopedRequests.filter((item) => item.status === "ordered").length,
  };

  const submit = async (work: () => Promise<any>, success: string) => {
    try {
      setSaving(true);
      await work();
      toast.success(success);
      await load();
    } catch (failure: any) {
      console.error(failure);
      toast.error(failure?.message || "Unable to save this procurement step.");
    } finally {
      setSaving(false);
    }
  };

  const createRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!estateId || !requestForm.title.trim() || Number(requestForm.amount) <= 0 || !actorId) return;

    await submit(
      () =>
        procurementWorkflowService.createRequest({
          estateId,
          title: requestForm.title,
          description: requestForm.description,
          amountMinor: Math.round(Number(requestForm.amount) * 100),
          currency,
          requestedBy: actorId,
        }),
      "Purchase request created."
    );
    setRequestForm({ title: "", description: "", amount: "" });
  };

  const approveRequest = async (requestId: string) => {
    await submit(
      () => procurementWorkflowService.updateRequestStatus({ requestId, status: "approved", approvedBy: actorId }),
      "Request approved."
    );
  };

  const rejectRequest = async (requestId: string) => {
    await submit(() => procurementWorkflowService.updateRequestStatus({ requestId, status: "rejected" }), "Request rejected.");
  };

  const createPurchaseOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!estateId || !selectedRequest || !poForm.vendorName.trim() || !poForm.poNumber.trim() || !actorId) return;
    const amountMinor = Math.round(Number(poForm.amount || selectedRequest.amount_minor || 0) * 100);
    if (amountMinor <= 0) return;

    await submit(
      () =>
        procurementWorkflowService.createPurchaseOrder({
          estateId,
          procurementRequestId: selectedRequest.id,
          poNumber: poForm.poNumber,
          vendorName: poForm.vendorName,
          amountMinor,
          currency,
          createdBy: actorId,
        }),
      "Purchase order created."
    );

    await submit(
      () => procurementWorkflowService.updateRequestStatus({ requestId: selectedRequest.id, status: "ordered", approvedBy: actorId }),
      "Request moved to ordered."
    );

    setPoForm({ requestId: selectedRequest.id, vendorName: "", poNumber: "", amount: "" });
  };

  const issueOrder = async (orderId: string) => {
    await submit(() => procurementWorkflowService.updatePurchaseOrderStatus(orderId, "issued", actorId), "Purchase order issued.");
  };

  const receiveOrder = async (order: PurchaseOrder) => {
    const form = receiptForm[order.id] || { reference: "", notes: "" };
    await submit(
      async () => {
        await procurementWorkflowService.recordGoodsReceipt({
          purchaseOrderId: order.id,
          receiptReference: form.reference,
          receivedBy: actorId,
          notes: form.notes,
        });
        await procurementWorkflowService.updatePurchaseOrderStatus(order.id, "received", actorId);
      },
      "Goods receipt recorded."
    );
    setReceiptForm((current) => ({ ...current, [order.id]: { reference: "", notes: "" } }));
  };

  const createVendorBill = async (event: React.FormEvent) => {
    event.preventDefault();
    const po = orders.find((order) => order.id === billForm.poId);
    if (!po || !billForm.billNumber.trim() || !billForm.amount) return;

    await submit(
      async () => {
        const bill = await estatePayablesService.createBill({
          estateId: po.estate_id,
          vendorId: po.vendor_id,
          purchaseOrderId: po.id,
          billNumber: billForm.billNumber,
          amountMinor: Math.round(Number(billForm.amount) * 100),
          currency: po.currency || currency,
          dueDate: billForm.dueDate || null,
          createdBy: actorId,
          description: `Bill for PO ${po.po_number} (${po.vendor_name})`,
        });
        setBillForm({ poId: "", billNumber: "", amount: "", dueDate: "" });
        setInvoiceMatch((current) => ({ ...current, billId: bill.id }));
        await load();
      },
      "Vendor bill recorded."
    );
  };

  const evaluateMatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invoiceMatch.billId.trim()) return;
    const toleranceMinor = Math.max(0, Math.round(Number(invoiceMatch.tolerance || 0) * 100));

    await submit(
      async () => {
        const evaluation = await invoiceMatchingService.evaluateMatch(
          invoiceMatch.billId.trim(),
          toleranceMinor
        );
        const matches = await invoiceMatchingService.listMatches([invoiceMatch.billId.trim()]);
        setMatchResult(matches[0] || null);
        void evaluation;
        await load();
      },
      "Invoice match evaluated."
    );
  };

  const approveVariance = async (matchId: string) => {
    if (!actorId) return;
    await submit(
      async () => {
        await invoiceMatchingService.approveVariance(matchId, actorId);
        await load();
        setMatchResult(null);
      },
      "Variance approved."
    );
  };

  if (loading || resolvingOrg) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading procurement workspace...
      </div>
    );
  }

  if (!resolvedOrganizationId) {
    return (
      <Card className="p-8 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Procurement</h1>
        <p className="mt-2 text-muted-foreground">{error || "Open this module from a workspace to continue."}</p>
      </Card>
    );
  }

  const desktopFallback = (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-200">
      <div className="flex items-center gap-2 font-semibold text-amber-300">
        <ArrowRight className="h-4 w-4" />
        Desktop-only module
      </div>
      <p className="mt-2 text-amber-100/80">
        Procurement approval workflows are intentionally restricted to the desktop experience for governance and auditability.
      </p>
    </div>
  );

  return (
    <DesktopOnlyGate fallback={desktopFallback}>
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-subtle p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Procurement Center</h1>
                <p className="text-sm text-muted-foreground">
                  Request, approve, order, receive, and review vendor work without leaving the workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{organizationName || "Live organization"}</Badge>
              <Badge variant="outline">{estates.length} estate(s)</Badge>
              <Badge variant="outline">{scopedRequests.length} request(s)</Badge>
              <Badge variant="outline">{scopedOrders.length} PO(s)</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={saving}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">New requests</p>
          <p className="mt-2 text-2xl font-semibold">{requestStats.requested}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Approved requests</p>
          <p className="mt-2 text-2xl font-semibold">{requestStats.approved}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Ordered requests</p>
          <p className="mt-2 text-2xl font-semibold">{requestStats.ordered}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Create purchase request</h2>
          </div>
          <form className="mt-4 space-y-3" onSubmit={createRequest}>
            <NativeSelectControl
              className="w-full rounded-lg border border-border bg-input-background px-3 py-2"
              value={estateId}
              onChange={(event) => setEstateId(event.target.value)}
            >
              {estates.map((estate) => (
                <option key={estate.id} value={estate.id}>
                  {estate.name}
                </option>
              ))}
            </NativeSelectControl>
            <Input
              placeholder="Request title"
              value={requestForm.title}
              onChange={(event) => setRequestForm({ ...requestForm, title: event.target.value })}
            />
            <Input
              placeholder="Short description"
              value={requestForm.description}
              onChange={(event) => setRequestForm({ ...requestForm, description: event.target.value })}
            />
            <Input
              placeholder="Expected amount"
              type="number"
              min="0"
              step="0.01"
              value={requestForm.amount}
              onChange={(event) => setRequestForm({ ...requestForm, amount: event.target.value })}
            />
            <Button disabled={saving || !selectedEstate}>
              <Send className="h-4 w-4" />
              Submit request
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Request queue</h2>
          </div>
          <div className="mt-4 space-y-3">
            {scopedRequests.length ? (
              scopedRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {request.description || "No description"} · {money(request.amount_minor || 0, request.currency)}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {request.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.status === "requested" && (
                      <>
                        <Button size="sm" onClick={() => void approveRequest(request.id)} disabled={saving}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void rejectRequest(request.id)} disabled={saving}>
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPoForm({
                            requestId: request.id,
                            vendorName: "",
                            poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${request.id.slice(0, 4)}`,
                            amount: String((request.amount_minor || 0) / 100),
                          });
                        }}
                      >
                        Prepare PO
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No requests yet for the selected estate.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Create purchase order</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep the PO linked to the approved request so approvals, delivery, and bills stay together.
          </p>
          <form className="mt-4 space-y-3" onSubmit={createPurchaseOrder}>
            <NativeSelectControl
              className="w-full rounded-lg border border-border bg-input-background px-3 py-2"
              value={poForm.requestId}
              onChange={(event) => {
                const request = scopedRequests.find((item) => item.id === event.target.value);
                setPoForm({
                  requestId: event.target.value,
                  vendorName: poForm.vendorName,
                  poNumber: poForm.poNumber,
                  amount: request ? String((request.amount_minor || 0) / 100) : poForm.amount,
                });
              }}
            >
              <option value="">Select approved request</option>
              {scopedRequests
                .filter((request) => request.status === "approved")
                .map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.title}
                  </option>
                ))}
            </NativeSelectControl>
            <Input
              placeholder="Vendor name"
              value={poForm.vendorName}
              onChange={(event) => setPoForm({ ...poForm, vendorName: event.target.value })}
            />
            <Input
              placeholder="PO number"
              value={poForm.poNumber}
              onChange={(event) => setPoForm({ ...poForm, poNumber: event.target.value })}
            />
            <Input
              placeholder="Amount"
              type="number"
              min="0"
              step="0.01"
              value={poForm.amount}
              onChange={(event) => setPoForm({ ...poForm, amount: event.target.value })}
            />
            <Button disabled={saving || !selectedRequest}>
              <ArrowRight className="h-4 w-4" />
              Create PO
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Receiving and match review</h2>
          </div>
          <div className="mt-4 space-y-3">
            {scopedOrders.length ? (
              scopedOrders.map((order) => {
                const receipt = receiptForm[order.id] || { reference: "", notes: "" };
                return (
                  <div key={order.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{order.po_number}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.vendor_name} · {money(order.amount_minor, order.currency)}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input
                          placeholder="Receipt reference"
                          value={receipt.reference}
                          onChange={(event) =>
                            setReceiptForm((current) => ({
                              ...current,
                              [order.id]: { ...receipt, reference: event.target.value },
                            }))
                          }
                        />
                        <Input
                          placeholder="Receiving notes"
                          value={receipt.notes}
                          onChange={(event) =>
                            setReceiptForm((current) => ({
                              ...current,
                              [order.id]: { ...receipt, notes: event.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => void issueOrder(order.id)} disabled={saving}>
                            Issue order
                          </Button>
                        )}
                        {order.status !== "received" && order.status !== "cancelled" && (
                          <Button size="sm" onClick={() => void receiveOrder(order)} disabled={saving}>
                            Record receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Invoice match check</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Three-way match compares purchase order, goods receipt, and vendor bill totals.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" onSubmit={createVendorBill}>
          <NativeSelectControl
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={billForm.poId}
            onChange={(event) => setBillForm({ ...billForm, poId: event.target.value })}
          >
            <option value="">Record bill against PO…</option>
            {orders
              .filter((order) => !["cancelled", "closed"].includes(order.status))
              .map((order) => (
                <option key={order.id} value={order.id}>
                  {order.po_number} — {order.vendor_name} ({money(order.amount_minor, order.currency || currency)})
                </option>
              ))}
          </NativeSelectControl>
          <Input
            placeholder="Bill number"
            value={billForm.billNumber}
            onChange={(event) => setBillForm({ ...billForm, billNumber: event.target.value })}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={`Amount (${currency})`}
            value={billForm.amount}
            onChange={(event) => setBillForm({ ...billForm, amount: event.target.value })}
          />
          <Input
            type="date"
            value={billForm.dueDate}
            onChange={(event) => setBillForm({ ...billForm, dueDate: event.target.value })}
          />
          <Button disabled={saving || !billForm.poId || !billForm.billNumber.trim() || !billForm.amount}>
            Record bill
          </Button>
        </form>
        <form className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={evaluateMatch}>
          <NativeSelectControl
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={invoiceMatch.billId}
            onChange={(event) => setInvoiceMatch({ ...invoiceMatch, billId: event.target.value })}
          >
            <option value="">Select vendor bill</option>
            {vendorBills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.bill_number} — {money(bill.amount_minor, currency)} ({bill.status})
              </option>
            ))}
          </NativeSelectControl>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Tolerance (GHS)"
            value={invoiceMatch.tolerance}
            onChange={(event) => setInvoiceMatch({ ...invoiceMatch, tolerance: event.target.value })}
          />
          <Button disabled={saving || !invoiceMatch.billId}>
            <CheckCircle2 className="h-4 w-4" />
            Run match
          </Button>
        </form>
        {matchResult ? (
          <div className="mt-4 rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Match result</span>
              <Badge variant={matchResult.status === "matched" ? "default" : "outline"} className="capitalize">
                {matchResult.status}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <p>PO total: {money(matchResult.po_total_minor, currency)}</p>
              <p>Received: {money(matchResult.received_total_minor, currency)}</p>
              <p>Invoice: {money(matchResult.invoice_total_minor, currency)}</p>
              <p>Variance: {money(matchResult.variance_minor, currency)}</p>
            </div>
            {matchResult.status === "variance" && actorId ? (
              <Button size="sm" onClick={() => void approveVariance(matchResult.id)}>
                Approve variance
              </Button>
            ) : null}
          </div>
        ) : null}
        {pendingMatches.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Pending variance review</h3>
            {pendingMatches.slice(0, 5).map((match) => (
              <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs">
                <span>Bill {match.vendor_bill_id.slice(0, 8)} — variance {money(match.variance_minor, currency)}</span>
                <Button size="sm" variant="outline" onClick={() => setMatchResult(match)}>
                  Review
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
    </DesktopOnlyGate>
  );
}
