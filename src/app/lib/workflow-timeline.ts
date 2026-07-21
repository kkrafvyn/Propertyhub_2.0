import type { TimelineStep } from "../components/ux/ActivityTimeline";

export function buildPurchaseTimeline(
  dealCase: any,
  escrowHold?: any,
  extras?: { counterOffers?: any[]; checklist?: any[]; pendingDocs?: any[] }
): TimelineStep[] {
  const status = String(dealCase?.status || "pending");
  const stage = String(dealCase?.pipeline_stage || "new_inquiry");
  const depositPaid = escrowHold?.status === "held" || escrowHold?.status === "released";
  const hasCounterOffer = (extras?.counterOffers || []).some((o) => o.status === "pending");
  const acceptedCounter = (extras?.counterOffers || []).find((o) => o.status === "accepted");
  const checklistDone =
    extras?.checklist?.length &&
    extras.checklist.every((item: any) => item.completed);
  const docsSigned =
    extras?.pendingDocs !== undefined ? extras.pendingDocs.length === 0 : false;

  return [
    { id: "submitted", label: "Offer submitted", status: "completed", timestamp: dealCase?.created_at },
    {
      id: "review",
      label: hasCounterOffer ? "Counter-offer in negotiation" : "Offer under review",
      status: ["approved", "closed"].includes(status)
        ? "completed"
        : hasCounterOffer || stage === "negotiation"
          ? "current"
          : stage === "new_inquiry"
            ? "current"
            : "upcoming",
      timestamp: dealCase?.updated_at,
    },
    {
      id: "accepted",
      label: acceptedCounter ? "Counter-offer accepted" : "Offer accepted",
      status: ["approved", "closed"].includes(status) ? "completed" : "upcoming",
    },
    {
      id: "deposit",
      label: "Deposit paid",
      status: depositPaid ? "completed" : status === "approved" ? "current" : "upcoming",
    },
    {
      id: "inspection",
      label: "Inspection scheduled",
      status: stage === "viewing_scheduled" ? "current" : depositPaid ? "upcoming" : "upcoming",
    },
    {
      id: "signing",
      label: docsSigned ? "Documents signed" : "Awaiting document signing",
      status: docsSigned ? "completed" : depositPaid ? "current" : "upcoming",
      href: "/app/documents",
    },
    {
      id: "checklist",
      label: checklistDone ? "Closing checklist complete" : "Closing checklist in progress",
      status: checklistDone ? "completed" : depositPaid ? "current" : "upcoming",
    },
    { id: "closing", label: "Closing", status: status === "closed" ? "completed" : "upcoming" },
  ];
}

export function buildLeaseTimeline(lease: any, schedule?: any[]): TimelineStep[] {
  const active = lease?.status === "active";
  const signed = lease?.signing_status === "signed";
  const due = lease?.next_rent_due_at;
  const nextSchedule = (schedule || []).find((row) => row.status === "upcoming" || row.status === "overdue");
  const renewal = lease?.renewal_status;

  return [
    {
      id: "signing",
      label: signed ? "Lease signed" : "Awaiting lease signature",
      status: signed ? "completed" : "current",
      timestamp: lease?.signed_at,
      href: "/app/documents",
    },
    { id: "started", label: "Lease started", status: signed ? "completed" : "upcoming", timestamp: lease?.start_date },
    {
      id: "active",
      label: "Active tenancy",
      status: active && signed ? "current" : "upcoming",
    },
    {
      id: "rent",
      label: nextSchedule
        ? `Rent due ${nextSchedule.due_date}`
        : due
          ? `Next rent due ${due}`
          : "Rent schedule active",
      status: active ? "current" : "upcoming",
      href: "/app/leases",
    },
    {
      id: "renewal",
      label:
        renewal === "requested"
          ? "Renewal requested"
          : renewal === "approved"
            ? "Renewal approved"
            : "Renewal available",
      status: renewal === "requested" ? "current" : renewal === "approved" ? "completed" : "upcoming",
    },
    {
      id: "maintenance",
      label: "Maintenance support available",
      status: active ? "current" : "upcoming",
      href: "/app/maintenance",
    },
  ];
}

export function buildBookingTimeline(booking: any, reviews?: any[]): TimelineStep[] {
  const status = String(booking?.status || "pending");
  const today = new Date().toISOString().slice(0, 10);
  const isRequest = booking?.booking_mode === "request";
  const hasReview = (reviews || []).some((r) => r.reviewer_role === "guest");

  return [
    {
      id: "requested",
      label: isRequest ? "Request to book submitted" : "Booking requested",
      status: "completed",
      timestamp: booking?.created_at,
    },
    {
      id: "confirmed",
      label: isRequest ? "Host approved request" : "Booking confirmed",
      status: ["confirmed", "completed"].includes(status)
        ? "completed"
        : status === "pending"
          ? "current"
          : status === "cancelled"
            ? "completed"
            : "upcoming",
    },
    {
      id: "checkin",
      label: booking?.checked_in_at ? "Checked in" : `Check in ${booking?.check_in || ""}`,
      status: booking?.checked_in_at
        ? "completed"
        : status === "confirmed" && booking?.check_in <= today
          ? "current"
          : "upcoming",
      timestamp: booking?.checked_in_at,
    },
    {
      id: "checkout",
      label: booking?.checked_out_at ? "Checked out" : `Check out ${booking?.check_out || ""}`,
      status: booking?.checked_out_at ? "completed" : booking?.checked_in_at ? "current" : "upcoming",
      timestamp: booking?.checked_out_at,
    },
    {
      id: "review",
      label: hasReview ? "Review submitted" : "Leave a review",
      status: hasReview ? "completed" : status === "completed" ? "current" : "upcoming",
    },
    {
      id: "cancelled",
      label: booking?.refund_minor
        ? `Cancelled · refund ${(booking.refund_minor / 100).toFixed(0)} GHS`
        : status === "cancelled"
          ? "Cancelled"
          : "Cancellation policy applies",
      status: status === "cancelled" ? "completed" : "upcoming",
      timestamp: booking?.cancelled_at,
    },
  ].filter((step) => step.id !== "cancelled" || status === "cancelled");
}

export function buildMaintenanceTimeline(request: any): TimelineStep[] {
  const status = String(request?.status || "open");

  return [
    { id: "submitted", label: "Request submitted", status: "completed", timestamp: request?.created_at },
    {
      id: "progress",
      label: request?.vendor_id ? "Vendor assigned" : "Awaiting assignment",
      status: status === "open" ? "current" : "completed",
    },
    {
      id: "in_progress",
      label: "Work in progress",
      status: status === "in_progress" ? "current" : status === "resolved" ? "completed" : "upcoming",
    },
    {
      id: "resolved",
      label: "Issue resolved",
      status: status === "resolved" ? "completed" : status === "in_progress" ? "current" : "upcoming",
      timestamp: request?.updated_at,
    },
  ];
}

export function buildEscrowTimeline(hold: any): TimelineStep[] {
  const status = String(hold?.status || "held");

  return [
    { id: "held", label: "Funds held in escrow", status: "completed", timestamp: hold?.created_at },
    {
      id: "review",
      label: "Escrow review",
      status: status === "held" ? "current" : "completed",
    },
    {
      id: "released",
      label: status === "refunded" ? "Funds refunded" : "Funds released",
      status: ["released", "refunded"].includes(status) ? "completed" : status === "disputed" ? "current" : "upcoming",
      timestamp: hold?.released_at,
    },
  ];
}
