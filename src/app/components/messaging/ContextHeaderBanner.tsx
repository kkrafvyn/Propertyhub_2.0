/**
 * BaytMiftah REOS — Context Header Banner
 * ───────────────────────────────────────
 * Displays rich operational context at the top of the chat:
 * Property address, unit number, active lease status, open maintenance ticket count.
 */

import React from "react";
import { Building2, KeyRound, Wrench, ShieldCheck, Tag, ExternalLink } from "lucide-react";
import type { Conversation } from "../../../lib/realtime-messaging.service";

interface ContextHeaderBannerProps {
  conversation: Conversation;
  onOpenContextDrawer?: () => void;
}

export const ContextHeaderBanner: React.FC<ContextHeaderBannerProps> = ({
  conversation,
  onOpenContextDrawer,
}) => {
  const propertyName = conversation.metadata?.propertyName || "BaytMiftah Estate";
  const unitNumber = conversation.metadata?.unitNumber;
  const isMaintenanceLinked = Boolean(conversation.maintenance_issue_id || conversation.work_order_id);
  const isLeaseLinked = Boolean(conversation.lease_id);

  return (
    <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
      {/* Left: Entity context badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Property & Unit Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span>{propertyName}</span>
          {unitNumber && (
            <span className="bg-primary/10 text-primary font-semibold px-1.5 py-0.2 rounded text-[11px]">
              Unit {unitNumber}
            </span>
          )}
        </div>

        {/* Lease Pill */}
        {isLeaseLinked && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            <KeyRound className="w-3 h-3" />
            <span>Active Lease</span>
          </div>
        )}

        {/* Maintenance / Work order Pill */}
        {isMaintenanceLinked && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
            <Wrench className="w-3 h-3" />
            <span>Operational Ticket Linked</span>
          </div>
        )}

        {/* Conversation Type Tag */}
        <div className="inline-flex items-center gap-1 text-muted-foreground">
          <Tag className="w-3 h-3" />
          <span className="capitalize">{conversation.conversation_type} thread</span>
        </div>
      </div>

      {/* Right: AI & Details trigger */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[11px] font-medium border border-violet-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span>AI Intent Engine Active</span>
        </div>

        {onOpenContextDrawer && (
          <button
            onClick={onOpenContextDrawer}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-xs transition-colors"
          >
            <span>ERP Context</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
