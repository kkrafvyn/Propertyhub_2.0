import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const selectMock = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "notification_preferences") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  email_enabled: false,
                  sms_enabled: false,
                  push_enabled: false,
                  in_app_enabled: true,
                  whatsapp_enabled: false,
                  notification_frequency: "immediate",
                  quiet_hours_enabled: false,
                  quiet_hours_start: "22:00",
                  quiet_hours_end: "08:00",
                },
              }),
            }),
          }),
        };
      }
      if (table === "notification_logs") {
        return {
          insert: insertMock.mockReturnValue({
            select: () => ({
              single: async () => ({ data: { id: "n1" }, error: null }),
            }),
          }),
        };
      }
      return { select: selectMock };
    },
  },
}));

import { communicationService } from "./communication.service";

describe("communicationService.notify", () => {
  beforeEach(() => {
    insertMock.mockClear();
  });

  it("creates one in-app notification when includeExternal is enabled", async () => {
    await communicationService.notify("user-1", "test", "Subject", "Body", {
      includeExternal: true,
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
