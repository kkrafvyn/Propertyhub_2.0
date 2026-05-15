import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTheApp } from "./GetTheApp";
import { publicDiscoveryService } from "../../lib/public-discovery.service";

vi.mock("../components/Navbar", () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock("../../lib/public-discovery.service", async () => {
  const actual = await vi.importActual<typeof import("../../lib/public-discovery.service")>(
    "../../lib/public-discovery.service"
  );

  return {
    ...actual,
    publicDiscoveryService: {
      ...actual.publicDiscoveryService,
      getMobileExperienceSnapshot: vi.fn(),
    },
  };
});

const getMobileExperienceSnapshotMock = vi.mocked(publicDiscoveryService.getMobileExperienceSnapshot);

describe("GetTheApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("highlights the best mobile build for the current device", async () => {
    getMobileExperienceSnapshotMock.mockResolvedValue({
      platforms: [
        {
          platform: "ios",
          label: "Apple App Store",
          latestVersion: "1.4.0",
          minimumVersion: "1.3.0",
          updateUrl: "https://apps.apple.com/app/propertyhub",
          forceUpdate: false,
        },
        {
          platform: "android",
          label: "Google Play",
          latestVersion: "1.5.0",
          minimumVersion: "1.4.0",
          updateUrl: "https://play.google.com/store/apps/details?id=com.propertyhub",
          forceUpdate: true,
        },
      ],
      releaseHeadline: "Android 1.5.0 is now live for field teams.",
      browserPushLabel: "Browser alerts available",
      highlights: ["Faster offer follow-up"],
      fieldMoments: ["Coordinate viewings in real time"],
    });

    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
      configurable: true,
    });

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <MemoryRouter>
        <GetTheApp />
      </MemoryRouter>
    );

    expect(await screen.findByText(/recommended for this device: google play 1.5.0/i)).toBeInTheDocument();
    expect(screen.getByText(/best match for this device/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /download for android/i }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.propertyhub",
      "_blank",
      "noopener,noreferrer"
    );

    openSpy.mockRestore();
  });
});
