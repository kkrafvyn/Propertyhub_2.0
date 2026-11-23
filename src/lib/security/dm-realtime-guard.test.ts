import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(resolve(process.cwd(), "src/lib/realtime-messaging.service.ts"), "utf8");
const topicPolicy = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261122190000_private_conversation_realtime.sql"),
  "utf8",
);
const messageGuard = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261122191000_guard_message_identity.sql"),
  "utf8",
);

describe("DM privacy contract (static; production RLS needs live integration testing)", () => {
  it("joins private channels and never renders client-broadcast messages as durable records", () => {
    expect(service).toContain("private: true");
    expect(service).not.toContain('.on("broadcast", { event: "NEW_MESSAGE" }');
    expect(service).not.toContain('event: "NEW_MESSAGE",');
    expect(service).toContain('"postgres_changes"');
  });

  it("authorizes broadcast and presence by conversation membership", () => {
    expect(topicPolicy).toContain("ON realtime.messages");
    expect(topicPolicy).toContain("private.can_access_conversation_realtime_topic");
    expect(topicPolicy).toContain("public.user_participates_in_conversation(c.id)");
    expect(topicPolicy).toContain("private.workspace_conversation_access(c.id)");
    expect(topicPolicy).toMatch(/FOR SELECT TO authenticated/);
    expect(topicPolicy).toMatch(/FOR INSERT TO authenticated/);
  });

  it("blocks client-side message identity relocation and forged system senders", () => {
    expect(messageGuard).toContain("NEW.conversation_id");
    expect(messageGuard).toContain("OLD.conversation_id");
    expect(messageGuard).toContain("'ai_bot'");
    expect(messageGuard).toContain("'system_event'");
    expect(messageGuard).toContain("BEFORE INSERT OR UPDATE ON public.messages");
  });
});
