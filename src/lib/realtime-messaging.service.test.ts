/**
 * BaytMiftah REOS — Realtime Contextual Messaging & AI Intent Engine Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 *   1. Supabase Realtime contextual conversation creation & message persistence
 *   2. High confidence auto-ticket creation from normal natural language
 *   3. Multi-issue extraction (Plumbing + Electrical + HVAC)
 *   4. Ambiguous medium-confidence clarification questions
 *   5. Low-confidence grievance routing
 *   6. Contextual recurring issue detection & reopening
 *   7. Omnichannel routing (In-App + FCM Push + SMS Gateway)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock maintenanceService and supabase to avoid node network lookup latency
vi.mock("./maintenance.service", () => ({
  maintenanceService: {
    createRequest: vi.fn().mockImplementation(async (input) => ({
      id: "req-auto-1842",
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: "open",
      created_at: new Date().toISOString(),
    })),
  },
}));

vi.mock("./supabase", () => {
  const dummyQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: new Error("Mock fallback") }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(dummyQueryBuilder),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue(true),
      }),
    },
  };
});

import {
  realtimeMessagingService,
  type ConversationContext,
} from "./realtime-messaging.service";
import { aiIntentActionEngine } from "./ai-intent-action-engine.service";
import { omnichannelRouterService } from "./omnichannel-router.service";
import { fcmPushService } from "./fcm-push.service";

describe("BaytMiftah Realtime Contextual Messaging System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Realtime Messaging Core", () => {
    it("creates a contextual conversation linked to property, unit, and lease", async () => {
      const context: ConversationContext = {
        organizationId: "org-101",
        propertyId: "prop-202",
        unitId: "unit-303",
        leaseId: "lease-404",
        propertyName: "Villaggio Vista",
        unitNumber: "B12",
      };

      const conversation = await realtimeMessagingService.getOrCreateContextualConversation(
        context,
        [
          { userId: "user-tenant-1", role: "tenant" },
          { userId: "user-agent-2", role: "agent" },
        ],
        "Villaggio Vista • Unit B12 Management"
      );

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.property_id).toBe("prop-202");
      expect(conversation.unit_id).toBe("unit-303");
      expect(conversation.lease_id).toBe("lease-404");
    });

    it("sends a message and broadcasts to subscribers", async () => {
      const conv = await realtimeMessagingService.getOrCreateContextualConversation(
        { propertyName: "Airport Hills" },
        [{ userId: "user-1", role: "resident" }]
      );

      let broadcastedMsg: any = null;
      const unsubscribe = realtimeMessagingService.subscribeToConversation(conv.id, {
        onMessage: (msg) => {
          broadcastedMsg = msg;
        },
      });

      const message = await realtimeMessagingService.sendMessage({
        conversationId: conv.id,
        senderId: "user-1",
        senderType: "user",
        senderName: "Kwame Resident",
        content: "Good morning, checking on my utility bill.",
      });

      expect(message).toBeDefined();
      expect(message.content).toBe("Good morning, checking on my utility bill.");
      expect(message.sender_name).toBe("Kwame Resident");

      const history = await realtimeMessagingService.getMessages(conv.id);
      expect(history.some((m) => m.content === "Good morning, checking on my utility bill.")).toBe(true);

      unsubscribe();
    });
  });

  describe("AI Intent → Action Engine (Agentic REOS Operational Bridge)", () => {
    it("automatically detects high-confidence maintenance from normal language and creates ticket", async () => {
      const conv = await realtimeMessagingService.getOrCreateContextualConversation(
        {
          organizationId: "org-demo",
          propertyName: "ABC Heights",
          unitNumber: "C14",
        },
        [{ userId: "user-kwame", role: "resident" }]
      );

      const userMsg = await realtimeMessagingService.sendMessage({
        conversationId: conv.id,
        senderId: "user-kwame",
        senderType: "user",
        senderName: "Kwame Mensah",
        content: "The water has stopped flowing in my apartment.",
      });

      const analysis = await aiIntentActionEngine.processIncomingMessage({
        conversationId: conv.id,
        message: userMsg,
        userId: "user-kwame",
        organizationId: "org-demo",
        propertyName: "ABC Heights",
        unitNumber: "C14",
      });

      expect(analysis.overallIntent).toBe("maintenance");
      expect(analysis.issues.length).toBeGreaterThan(0);
      expect(analysis.issues[0].category).toBe("plumbing");
      expect(analysis.issues[0].confidenceTier).toBe("high");
      expect(analysis.issues[0].priority).toBe("high");
      expect(analysis.issues[0].slaHours).toBe(4);
      expect(analysis.automatedActionTaken).toBe(true);
      expect(analysis.issues[0].createdTicketId).toBe("req-auto-1842");
    });

    it("extracts multiple issues from a single compound message into distinct linked tickets", async () => {
      const conv = await realtimeMessagingService.getOrCreateContextualConversation(
        { organizationId: "org-demo", unitNumber: "A4" },
        [{ userId: "user-tenant-multi", role: "tenant" }]
      );

      const userMsg = await realtimeMessagingService.sendMessage({
        conversationId: conv.id,
        senderId: "user-tenant-multi",
        senderType: "user",
        content: "The kitchen tap is leaking, the bedroom light doesn't work, and the AC is not cooling.",
      });

      const analysis = await aiIntentActionEngine.processIncomingMessage({
        conversationId: conv.id,
        message: userMsg,
        userId: "user-tenant-multi",
        organizationId: "org-demo",
      });

      expect(analysis.issues.length).toBe(3);

      const categories = analysis.issues.map((i) => i.category);
      expect(categories).toContain("plumbing");
      expect(categories).toContain("electrical");
      expect(categories).toContain("hvac");

      const hvacIssue = analysis.issues.find((i) => i.category === "hvac");
      expect(hvacIssue?.suggestedDepartment).toContain("HVAC");
    });

    it("asks clarifying question for medium-confidence ambiguous message without blindly creating tickets", async () => {
      const conv = await realtimeMessagingService.getOrCreateContextualConversation(
        { organizationId: "org-demo" },
        [{ userId: "user-ambiguous", role: "resident" }]
      );

      const userMsg = await realtimeMessagingService.sendMessage({
        conversationId: conv.id,
        senderId: "user-ambiguous",
        senderType: "user",
        content: "Something is wrong with the bathroom.",
      });

      const analysis = await aiIntentActionEngine.processIncomingMessage({
        conversationId: conv.id,
        message: userMsg,
        userId: "user-ambiguous",
        organizationId: "org-demo",
      });

      expect(analysis.issues[0].confidenceTier).toBe("medium");
      expect(analysis.issues[0].clarifyingQuestion).toBeDefined();
      expect(analysis.automatedActionTaken).toBe(false);
      expect(analysis.aiResponseText).toContain("Are you reporting a water leak");
    });

    it("detects recurring issue and suggests reopening previous closed ticket", async () => {
      const conv = await realtimeMessagingService.getOrCreateContextualConversation(
        { organizationId: "org-demo" },
        [{ userId: "user-recurring", role: "resident" }]
      );

      // Seed a past ticket in conversation history
      await realtimeMessagingService.sendMessage({
        conversationId: conv.id,
        senderType: "ai_bot",
        content: "Ticket #1731 created.",
        metadata: { ticketId: "1731-pipe-leak" },
      });

      const userMsg = await realtimeMessagingService.sendMessage({
        conversationId: conv.id,
        senderId: "user-recurring",
        senderType: "user",
        content: "The leak is back.",
      });

      const analysis = await aiIntentActionEngine.processIncomingMessage({
        conversationId: conv.id,
        message: userMsg,
        userId: "user-recurring",
        organizationId: "org-demo",
      });

      expect(analysis.issues[0].recurringTicketId).toBe("1731-pipe-leak");
      expect(analysis.aiResponseText).toContain("reopen");
    });
  });

  describe("Omnichannel Router & Push Notifications", () => {
    it("routes message across in-app, FCM push, and SMS for urgent alerts", async () => {
      const conv = await realtimeMessagingService.getOrCreateContextualConversation(
        { organizationId: "org-demo" },
        [{ userId: "user-urgent", role: "resident" }]
      );

      await fcmPushService.registerToken({
        userId: "user-urgent",
        token: "fcm-fake-device-token-12345",
        platform: "web",
      });

      const report = await omnichannelRouterService.routeMessage({
        conversationId: conv.id,
        recipientUserId: "user-urgent",
        recipientPhone: "+233241234567",
        senderName: "BaytMiftah Operations",
        content: "Urgent: Water main maintenance scheduled for 3 PM.",
        priority: "urgent",
      });

      expect(report.channelsAttempted).toContain("in_app");
      expect(report.channelsAttempted).toContain("push");
      expect(report.channelsAttempted).toContain("sms");
      expect(report.channelsSucceeded).toContain("in_app");
      expect(report.channelsSucceeded).toContain("push");
    });
  });
});
