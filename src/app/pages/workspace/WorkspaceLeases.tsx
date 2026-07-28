import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { leaseService } from "../../../lib/lease.service";
import { leaseWorkflowService } from "../../../lib/lease-workflow.service";
import { tenantNoticeService } from "../../../lib/tenant-notice.service";
import { walletService } from "../../../lib/wallet.service";
import { useAuth } from "../../context/AuthContext";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function WorkspaceLeases({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leases, setLeases] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeLeaseId, setNoticeLeaseId] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeType, setNoticeType] = useState("general");

  const loadLeases = async () => {
    try {
      setLoading(true);
      const [rows, noticeRows] = await Promise.all([
        leaseService.getOrganizationLeases(organizationId),
        tenantNoticeService.getOrganizationNotices(organizationId),
      ]);
      setLeases(rows || []);
      setNotices(noticeRows || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load leases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeases();
  }, [organizationId]);

  const respondRenewal = async (leaseId: string, status: "approved" | "declined") => {
    try {
      setBusyId(`${leaseId}-${status}`);
      await leaseWorkflowService.respondToRenewal(leaseId, status);
      toast.success(`Renewal ${status}.`);
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update renewal.");
    } finally {
      setBusyId(null);
    }
  };

  const sendNotice = async () => {
    const lease = leases.find((entry) => entry.id === noticeLeaseId) || leases[0];
    if (!lease?.tenant_user_id || !user?.id) {
      toast.error("Select a lease with an assigned tenant.");
      return;
    }
    if (!noticeTitle.trim() || !noticeBody.trim()) {
      toast.error("Add a title and message.");
      return;
    }

    try {
      setSendingNotice(true);
      await tenantNoticeService.sendNotice({
        organizationId,
        tenantUserId: lease.tenant_user_id,
        leaseId: lease.id,
        createdBy: user.id,
        noticeType,
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
      });
      toast.success("Notice sent to tenant.");
      setNoticeTitle("");
      setNoticeBody("");
      await loadLeases();
    } catch (error) {
      console.error(error);
      toast.error("Unable to send notice.");
    } finally {
      setSendingNotice(false);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading leases...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Leases</h1>
        <p className="text-muted-foreground">Active tenancies, renewals, rent schedules, and tenant notices.</p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Send tenant notice</h2>
        {leases.length > 0 ? (
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={noticeLeaseId || leases[0]?.id || ""}
            onChange={(event) => setNoticeLeaseId(event.target.value)}
          >
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenant?.full_name || lease.tenant?.email || "Tenant"} —{" "}
                {lease.listing?.property?.address || lease.id}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="w-full rounded-lg border border-border px-3 py-2"
          value={noticeType}
          onChange={(event) => setNoticeType(event.target.value)}
        >
          <option value="general">General</option>
          <option value="rent_increase">Rent increase</option>
          <option value="lease_renewal">Lease renewal</option>
          <option value="termination">Termination</option>
          <option value="inspection">Inspection</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <Input
          value={noticeTitle}
          onChange={(event) => setNoticeTitle(event.target.value)}
          placeholder="Notice title"
        />
        <textarea
          className="w-full min-h-24 rounded-lg border border-border px-3 py-2"
          value={noticeBody}
          onChange={(event) => setNoticeBody(event.target.value)}
          placeholder="Notice message"
        />
        <Button onClick={() => void sendNotice()} disabled={sendingNotice || leases.length === 0}>
          {sendingNotice ? "Sending..." : "Send notice"}
        </Button>
      </Card>

      {notices.length > 0 ? (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Recent notices</h2>
          {notices.slice(0, 8).map((notice) => (
            <div key={notice.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notice.title}</p>
                  <p className="text-sm text-muted-foreground">{notice.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notice.tenant?.full_name || notice.tenant?.email} ·{" "}
                    {new Date(notice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {notice.status}
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {leases.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No leases yet.</Card>
      ) : (
        leases.map((lease) => (
          <Card key={lease.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  {lease.listing?.property?.address || "Lease property"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lease.tenant?.full_name || lease.tenant?.email} · Started {lease.start_date}
                </p>
              </div>
              <div className="text-right space-y-2">
                <Badge className="capitalize">{lease.status}</Badge>
                {lease.renewal_status === "requested" ? (
                  <Badge variant="outline">Renewal requested</Badge>
                ) : null}
                <p className="font-semibold">{formatMoney(lease.rent_minor, lease.currency)}</p>
              </div>
            </div>
            {lease.renewal_status === "requested" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void respondRenewal(lease.id, "approved")}
                  disabled={busyId === `${lease.id}-approved`}
                >
                  Approve renewal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void respondRenewal(lease.id, "declined")}
                  disabled={busyId === `${lease.id}-declined`}
                >
                  Decline
                </Button>
              </div>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
