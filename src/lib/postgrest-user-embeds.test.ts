import { beforeEach, describe, expect, it, vi } from "vitest";
import { tenantNoticeService } from "./tenant-notice.service";
import { documentCenterService } from "./document-center.service";
import { maintenanceService } from "./maintenance.service";

const fromMock = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./notification.service", () => ({ notificationService: {} }));
vi.mock("./owner-oversight.service", () => ({ ownerOversightService: {} }));

function mockSelectChain(table: string, selectFn: (selectArg: string) => void) {
  fromMock.mockImplementation((name: string) => {
    if (name !== table) {
      throw new Error(`Unexpected table ${name}`);
    }
    return {
      select: vi.fn().mockImplementation((selectArg: string) => {
        selectFn(selectArg);
        return {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };
  });
}

describe("PostgREST users embed disambiguation", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("tenant_notices uses tenant_user_id foreign key hint", async () => {
    let selectArg = "";
    mockSelectChain("tenant_notices", (arg) => {
      selectArg = arg;
    });

    await tenantNoticeService.getOrganizationNotices("org-1");

    expect(selectArg).toContain("users!tenant_notices_tenant_user_id_fkey");
  });

  it("maintenance_requests uses tenant_user_id foreign key hint", async () => {
    let selectArg = "";
    mockSelectChain("maintenance_requests", (arg) => {
      selectArg = arg;
    });

    await maintenanceService.getOrganizationRequests("org-1");

    expect(selectArg).toContain("users!maintenance_requests_tenant_user_id_fkey");
  });

  it("organization_documents embeds deal_cases user via user_id foreign key", async () => {
    let selectArg = "";
    mockSelectChain("organization_documents", (arg) => {
      selectArg = arg;
    });

    await documentCenterService.getOrganizationDocuments("org-1");

    expect(selectArg).toContain("users!deal_cases_user_id_fkey");
  });
});
