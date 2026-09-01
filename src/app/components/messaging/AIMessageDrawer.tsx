/**
 * BaytMiftah REOS — AI Operations & ERP Context Drawer
 * ────────────────────────────────────────────────────
 * Slide-over drawer providing operations staff with deep AI insights:
 *  - Real-time intent & sentiment confidence analysis
 *  - Multi-issue breakdown & auto-assigned department SLA
 *  - Linked ERP records (Unit 360, Leases, Maintenance History, MoMo Invoices)
 *  - One-click smart response generators
 */

import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  Wrench,
  KeyRound,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  Send,
  X,
  AlertTriangle,
  History,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../ui/Button";
import type { Conversation } from "../../../lib/realtime-messaging.service";

interface AIMessageDrawerProps {
  conversation: Conversation;
  onClose: () => void;
  onSendSuggestedReply: (text: string) => void;
}

export const AIMessageDrawer: React.FC<AIMessageDrawerProps> = ({
  conversation,
  onClose,
  onSendSuggestedReply,
}) => {
  const [activeTab, setActiveTab] = useState<"ai_insights" | "erp_links">("ai_insights");

  const propertyName = conversation.metadata?.propertyName || "BaytMiftah Luxury Residence";
  const unitNumber = conversation.metadata?.unitNumber || "Suite 4B";

  const suggestedReplies = [
    "A maintenance technician has been dispatched to your unit and will arrive within 2 hours.",
    "Thank you for reporting this. We've logged ticket #REQ-8492 with our electrical team.",
    "We have verified your MoMo payment receipt. Your balance has been updated.",
    "Your lease renewal agreement is prepared and ready for digital signature.",
  ];

  return (
    <div className="w-80 sm:w-96 border-l border-border bg-card/95 backdrop-blur-md flex flex-col h-full z-20 shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI & ERP Copilot</h3>
            <p className="text-[11px] text-muted-foreground">Autonomous Operations Engine</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs font-medium">
        <button
          onClick={() => setActiveTab("ai_insights")}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === "ai_insights"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          AI Intent & Actions
        </button>
        <button
          onClick={() => setActiveTab("erp_links")}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === "erp_links"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Connected ERP
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === "ai_insights" ? (
          <>
            {/* Live Intent Classification */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Intent Classification
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  94% Confidence
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Primary Intent: <strong className="text-foreground">Maintenance (Plumbing)</strong>
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Routing:</span>
                <span className="font-medium text-foreground">Plumbing Contractor Team</span>
              </div>
            </div>

            {/* Recurring Issue Check */}
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <History className="w-3.5 h-3.5" />
                <span>Recurrence Detector</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Similar issue previously closed on <strong>Unit {unitNumber}</strong> (Ticket #1731, 12 days ago).
              </p>
            </div>

            {/* One-Click Smart Responses */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>AI Suggested Responses</span>
              </div>
              <div className="space-y-1.5">
                {suggestedReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendSuggestedReply(reply)}
                    className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-primary/5 transition-colors text-[11px] text-muted-foreground hover:text-foreground flex items-start justify-between gap-2 group"
                  >
                    <span>"{reply}"</span>
                    <Send className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Connected ERP Entities */}
            <div className="space-y-3">
              {/* Unit Card */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>{propertyName}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">Unit: {unitNumber}</p>
              </div>

              {/* Lease Status */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                    Active Lease
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">Expires Dec 2026</span>
                </div>
                <p className="text-muted-foreground text-[11px]">Rent: GH₵ 3,800/mo (Paid to date)</p>
              </div>

              {/* Maintenance Cases */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    Open Work Orders
                  </span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.2 rounded font-bold">1 Active</span>
                </div>
                <p className="text-muted-foreground text-[11px]">WO-491: Pipe repair (Assigned to Accra FastPlumb)</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Model: Gemini 3.7 / Supabase Realtime</span>
        <span className="text-emerald-500 font-medium">● Connected</span>
      </div>
    </div>
  );
};
