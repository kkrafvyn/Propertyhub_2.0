/**
 * BaytMiftah REOS — Embedded Contextual Action Cards
 * ───────────────────────────────────────────────────
 * Rendered inline inside the live message feed when system / AI events occur
 * (e.g., ticket creation, work order dispatch, lease renewal notices, property specs).
 */

import React from "react";
import { Building2, KeyRound, Wrench, Clock, CheckCircle2, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import { Button } from "../ui/Button";

interface CardProps {
  metadata?: Record<string, any>;
  onAction?: (actionName: string, payload?: any) => void;
}

/**
 * 1. Maintenance & Ticket Action Card
 */
export const MaintenanceContextCard: React.FC<CardProps> = ({ metadata = {}, onAction }) => {
  const ticketId = metadata.ticketId || "REQ-8492";
  const category = metadata.category || "plumbing";
  const priority = metadata.priority || "high";
  const slaHours = metadata.slaHours || 4;
  const status = metadata.status || "open";

  const priorityColor =
    priority === "urgent"
      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
      : priority === "high"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
      : "bg-blue-500/10 text-blue-600 border-blue-500/30";

  return (
    <div className="my-2 p-3.5 rounded-xl border border-border bg-card/80 backdrop-blur-xs max-w-sm shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Wrench className="w-4 h-4 text-primary" />
          <span>Ticket #{ticketId.slice(0, 8)}</span>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColor}`}>
          {priority} priority
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
        <div className="flex items-center justify-between">
          <span>Category:</span>
          <span className="font-medium text-foreground capitalize">{category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SLA Target:</span>
          <span className="font-medium text-foreground inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            {slaHours} hours
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400 capitalize inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7"
          onClick={() => onAction?.("view_ticket", { ticketId })}
        >
          View in Service Desk
        </Button>
      </div>
    </div>
  );
};

/**
 * 2. Property Specs Context Card
 */
export const PropertyContextCard: React.FC<CardProps> = ({ metadata = {}, onAction }) => {
  const propertyName = metadata.propertyName || "BaytMiftah Luxury Residence";
  const unitNumber = metadata.unitNumber || "A-204";
  const price = metadata.price || "GH₵ 3,500 / month";
  const address = metadata.address || "Airport Residential Area, Accra";

  return (
    <div className="my-2 p-3.5 rounded-xl border border-border bg-card/80 backdrop-blur-xs max-w-sm shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-foreground">{propertyName}</h4>
          <p className="text-[11px] text-muted-foreground">{address}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs py-2 my-1 border-y border-border/60">
        <span className="font-medium text-foreground">Unit {unitNumber}</span>
        <span className="font-bold text-primary">{price}</span>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="w-full text-xs h-7 text-primary hover:bg-primary/10 mt-1"
        onClick={() => onAction?.("view_property", metadata)}
      >
        <span>View Property 360</span>
        <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
};

/**
 * 3. Lease & Contract Context Card
 */
export const LeaseContextCard: React.FC<CardProps> = ({ metadata = {}, onAction }) => {
  const leaseId = metadata.leaseId || "LSE-2026-09";
  const expiryDate = metadata.expiryDate || "31 Dec 2026";
  const monthlyRent = metadata.monthlyRent || "GH₵ 4,200";

  return (
    <div className="my-2 p-3.5 rounded-xl border border-border bg-card/80 backdrop-blur-xs max-w-sm shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span>Lease #{leaseId.slice(0, 8)}</span>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
          Active
        </span>
      </div>

      <div className="text-xs space-y-1 text-muted-foreground mb-3">
        <div className="flex justify-between">
          <span>Monthly Rent:</span>
          <span className="font-medium text-foreground">{monthlyRent}</span>
        </div>
        <div className="flex justify-between">
          <span>Expiry Date:</span>
          <span className="font-medium text-foreground">{expiryDate}</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-7"
        onClick={() => onAction?.("view_lease", { leaseId })}
      >
        <span>Review Lease Terms</span>
      </Button>
    </div>
  );
};
