/**
 * BaytMiftah REOS — AI Intent → Action Engine
 * ────────────────────────────────────────────
 * Autonomous operational intent extraction and workflow dispatcher.
 * Bridges natural language messaging with REOS ERP operations (Maintenance,
 * Leases, Payments, Sales, Customer Support, Contractor Dispatch).
 */

import { maintenanceService } from "./maintenance.service";
import { realtimeMessagingService, type Message } from "./realtime-messaging.service";

export type DetectedIntent =
  | "maintenance"
  | "payment"
  | "lease"
  | "sales_inquiry"
  | "complaint"
  | "general_feedback"
  | "access_gate";

export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "structural"
  | "security_gate"
  | "general";

export type PriorityLevel = "low" | "normal" | "high" | "urgent";

export interface ExtractedOperationalIssue {
  intent: DetectedIntent;
  category?: MaintenanceCategory;
  title: string;
  description: string;
  priority: PriorityLevel;
  slaHours: number;
  confidence: number; // 0.0 - 1.0
  confidenceTier: "high" | "medium" | "low";
  suggestedDepartment: string;
  dispatchType: "in_house" | "contractor" | "manager_approval";
  clarifyingQuestion?: string;
  recurringTicketId?: string;
  createdTicketId?: string;
}

export interface IntentAnalysisResult {
  messageId: string;
  conversationId: string;
  overallIntent: DetectedIntent;
  issues: ExtractedOperationalIssue[];
  automatedActionTaken: boolean;
  aiResponseText?: string;
  metadata: {
    processedAt: string;
    model: string;
    ruleSetVersion: string;
  };
}

export class AIIntentActionEngine {
  /**
   * Main entry point: analyzes incoming user message against conversation history
   */
  async processIncomingMessage(params: {
    conversationId: string;
    message: Message;
    userId: string;
    organizationId?: string | null;
    propertyId?: string | null;
    unitId?: string | null;
    leaseId?: string | null;
    propertyName?: string;
    unitNumber?: string;
  }): Promise<IntentAnalysisResult> {
    const text = params.message.content.trim();
    if (!text || params.message.sender_type !== "user") {
      return {
        messageId: params.message.id,
        conversationId: params.conversationId,
        overallIntent: "general_feedback",
        issues: [],
        automatedActionTaken: false,
        metadata: {
          processedAt: new Date().toISOString(),
          model: "gemini-intent-action-v2",
          ruleSetVersion: "2026.08",
        },
      };
    }

    // 1. Fetch recent messages for context/recurrence check
    const recentMessages = await realtimeMessagingService.getMessages(params.conversationId, 10);

    // 2. Perform Multi-Issue Semantic Analysis & Intent Classification
    const issues = this.extractIssuesFromText(text, recentMessages, {
      propertyName: params.propertyName,
      unitNumber: params.unitNumber,
    });

    let automatedActionTaken = false;
    let aiReplyText = "";

    // 3. Execute Agentic Workflows based on Confidence Tiers
    for (const issue of issues) {
      if (issue.recurringTicketId) {
        // Recurring issue detected: prompt to reopen rather than blindly creating duplicate
        aiReplyText = `This appears to be related to previous ticket #${issue.recurringTicketId.slice(0, 8)}. Would you like me to reopen it for the technician?`;
        await realtimeMessagingService.sendMessage({
          conversationId: params.conversationId,
          senderType: "ai_bot",
          senderName: "BaytMiftah Assistant",
          content: aiReplyText,
          messageType: "action_request",
          metadata: {
            action: "reopen_ticket",
            targetTicketId: issue.recurringTicketId,
          },
        });
      } else if (issue.confidenceTier === "high" && issue.intent === "maintenance" && params.organizationId) {
        // High confidence: autonomously create ticket in ERP
        try {
          const createdRequest = await maintenanceService.createRequest({
            tenantUserId: params.userId,
            organizationId: params.organizationId,
            leaseId: params.leaseId || null,
            listingId: null,
            title: `[AI] ${issue.title}`,
            description: `${issue.description}\n\n[AI Metadata] Source: In-App Chat | Confidence: ${(issue.confidence * 100).toFixed(0)}% | SLA: ${issue.slaHours}h | Routing: ${issue.suggestedDepartment}`,
            priority: issue.priority,
          });

          issue.createdTicketId = createdRequest.id;
          automatedActionTaken = true;

          // Dispatch immediate contextual confirmation into the chat
          await realtimeMessagingService.sendMessage({
            conversationId: params.conversationId,
            senderType: "ai_bot",
            senderName: "BaytMiftah AI Operations",
            content: `I've created **Ticket #${createdRequest.id.slice(0, 8)}** (${issue.category?.toUpperCase() || "MAINTENANCE"}) with **${issue.priority.toUpperCase()}** priority.\n\nAssigned to: **${issue.suggestedDepartment}** (SLA target: ${issue.slaHours} hours). A technician will be assigned shortly.`,
            messageType: "maintenance_card",
            metadata: {
              ticketId: createdRequest.id,
              category: issue.category,
              priority: issue.priority,
              slaHours: issue.slaHours,
              status: "open",
              confidence: issue.confidence,
            },
          });
        } catch (err) {
          console.warn("[AIIntentActionEngine] Auto-ticket creation fallback:", err);
        }
      } else if (issue.confidenceTier === "medium" && issue.clarifyingQuestion) {
        // Medium confidence: ask clarifying question
        aiReplyText = issue.clarifyingQuestion;
        await realtimeMessagingService.sendMessage({
          conversationId: params.conversationId,
          senderType: "ai_bot",
          senderName: "BaytMiftah Assistant",
          content: issue.clarifyingQuestion,
          messageType: "text",
          metadata: {
            requiresClarification: true,
            tentativeCategory: issue.category,
          },
        });
      }
    }

    return {
      messageId: params.message.id,
      conversationId: params.conversationId,
      overallIntent: issues[0]?.intent || "general_feedback",
      issues,
      automatedActionTaken,
      aiResponseText: aiReplyText,
      metadata: {
        processedAt: new Date().toISOString(),
        model: "gemini-intent-action-v2",
        ruleSetVersion: "2026.08",
      },
    };
  }

  /**
   * Multi-issue classifier & intent extractor
   */
  private extractIssuesFromText(
    text: string,
    history: Message[],
    context: { propertyName?: string; unitNumber?: string }
  ): ExtractedOperationalIssue[] {
    const issues: ExtractedOperationalIssue[] = [];
    const lower = text.toLowerCase();

    // ── Check for recurring issue phrases ──
    const isRecurring =
      lower.includes("again") ||
      lower.includes("is back") ||
      lower.includes("still leaking") ||
      lower.includes("not fixed") ||
      lower.includes("same problem");

    let pastTicketId: string | undefined;
    if (isRecurring) {
      const pastTicketMsg = history.find(
        (m) => m.metadata && m.metadata.ticketId
      );
      if (pastTicketMsg) {
        pastTicketId = pastTicketMsg.metadata.ticketId;
      }
    }

    // ── 1. Plumbing issues ──
    if (
      lower.includes("water") ||
      lower.includes("leak") ||
      lower.includes("pipe") ||
      lower.includes("tap") ||
      lower.includes("toilet") ||
      lower.includes("drain") ||
      lower.includes("flood") ||
      lower.includes("sink") ||
      lower.includes("shower")
    ) {
      const isUrgent = lower.includes("flood") || lower.includes("badly") || lower.includes("burst");
      const isHigh = lower.includes("stopped flowing") || lower.includes("no water") || lower.includes("leak");
      const priority: PriorityLevel = isUrgent ? "urgent" : isHigh ? "high" : "normal";

      issues.push({
        intent: "maintenance",
        category: "plumbing",
        title: isUrgent ? "Flooding / Severe Water Leak" : lower.includes("no water") ? "No Water Supply" : "Plumbing Leak",
        description: text,
        priority,
        slaHours: priority === "urgent" ? 2 : priority === "high" ? 4 : 24,
        confidence: 0.94,
        confidenceTier: "high",
        suggestedDepartment: "Plumbing Technician Team",
        dispatchType: isUrgent ? "contractor" : "in_house",
        recurringTicketId: pastTicketId,
      });
    }

    // ── 2. Electrical issues ──
    if (
      lower.includes("light") ||
      lower.includes("power") ||
      lower.includes("electricity") ||
      lower.includes("socket") ||
      lower.includes("spark") ||
      lower.includes("breaker") ||
      lower.includes("switch")
    ) {
      const isUrgent = lower.includes("spark") || lower.includes("smoke") || lower.includes("fire");
      const priority: PriorityLevel = isUrgent ? "urgent" : "normal";

      issues.push({
        intent: "maintenance",
        category: "electrical",
        title: isUrgent ? "Electrical Hazard / Sparking" : "Electrical / Lighting Issue",
        description: text,
        priority,
        slaHours: isUrgent ? 1 : 24,
        confidence: 0.92,
        confidenceTier: "high",
        suggestedDepartment: "Electrical Technician Team",
        dispatchType: "in_house",
      });
    }

    // ── 3. HVAC / AC Cooling issues ──
    if (
      lower.includes("ac") ||
      lower.includes("a/c") ||
      lower.includes("cooling") ||
      lower.includes("heating") ||
      lower.includes("air conditioner") ||
      lower.includes("hot air")
    ) {
      issues.push({
        intent: "maintenance",
        category: "hvac",
        title: "HVAC / Air Conditioning Malfunction",
        description: text,
        priority: "normal",
        slaHours: 24,
        confidence: 0.91,
        confidenceTier: "high",
        suggestedDepartment: "HVAC Contractor Specialists",
        dispatchType: "contractor",
      });
    }

    // ── 4. Medium-confidence ambiguous maintenance ──
    if (
      issues.length === 0 &&
      (lower.includes("broken") ||
        lower.includes("not working") ||
        lower.includes("something is wrong") ||
        lower.includes("problem in bathroom") ||
        lower.includes("issue in kitchen"))
    ) {
      issues.push({
        intent: "maintenance",
        category: "general",
        title: "Unspecified Maintenance Issue",
        description: text,
        priority: "normal",
        slaHours: 24,
        confidence: 0.65,
        confidenceTier: "medium",
        suggestedDepartment: "General Facility Maintenance",
        dispatchType: "in_house",
        clarifyingQuestion:
          "Are you reporting a water leak, electrical issue, appliance failure, or another specific problem?",
      });
    }

    // ── 5. Payment & Billing ──
    if (
      lower.includes("rent payment") ||
      lower.includes("invoice") ||
      lower.includes("receipt") ||
      lower.includes("momo charge") ||
      lower.includes("billing") ||
      lower.includes("deposit")
    ) {
      issues.push({
        intent: "payment",
        title: "Payment / Billing Inquiry",
        description: text,
        priority: "normal",
        slaHours: 12,
        confidence: 0.88,
        confidenceTier: "high",
        suggestedDepartment: "Finance & Accounts",
        dispatchType: "in_house",
      });
    }

    // ── 6. Lease & Tenancy ──
    if (
      lower.includes("renew lease") ||
      lower.includes("sublease") ||
      lower.includes("move out") ||
      lower.includes("agreement") ||
      lower.includes("terminate lease")
    ) {
      issues.push({
        intent: "lease",
        title: "Lease / Tenancy Request",
        description: text,
        priority: "normal",
        slaHours: 24,
        confidence: 0.89,
        confidenceTier: "high",
        suggestedDepartment: "Property Management & Leasing",
        dispatchType: "in_house",
      });
    }

    // ── 7. Low confidence / General feedback / Complaints ──
    if (issues.length === 0) {
      const isComplaint =
        lower.includes("terrible") ||
        lower.includes("awful") ||
        lower.includes("unacceptable") ||
        lower.includes("worst") ||
        lower.includes("angry");

      issues.push({
        intent: isComplaint ? "complaint" : "general_feedback",
        title: isComplaint ? "Resident Grievance / Complaint" : "General Message",
        description: text,
        priority: isComplaint ? "high" : "low",
        slaHours: isComplaint ? 8 : 48,
        confidence: 0.45,
        confidenceTier: "low",
        suggestedDepartment: isComplaint ? "Customer Experience Management" : "Support",
        dispatchType: "in_house",
      });
    }

    return issues;
  }
}

export const aiIntentActionEngine = new AIIntentActionEngine();
