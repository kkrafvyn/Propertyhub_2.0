import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsumerDemoContent } from "./ConsumerDemo";

vi.mock("../components/baytmiftah", () => ({ DesktopShell: () => null, PageMeta: () => null }));
afterEach(cleanup);
const show = () => render(<MemoryRouter><ConsumerDemoContent /></MemoryRouter>);
describe("Consumer sample homes", () => {
  it("identifies fictional inventory and uses the approved logo and local photography", () => {
    show();
    expect(screen.getByRole("note").textContent).toContain("not available to book, rent, or buy");
    expect(screen.getByAltText("BaytMiftah — Unlocking property opportunities").getAttribute("src")).toContain("brand/logo-approved.png");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByAltText("Illustrative Cantonments Garden Residence").getAttribute("src")).toContain("residences-1280.webp");
  });
  it("filters and saves locally, with demo details rather than live transaction links", () => {
    show();
    fireEvent.click(screen.getByRole("button", {name: "Save demo Cantonments Garden Residence"}));
    fireEvent.click(screen.getByRole("button", {name: "Saved", exact: true}));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", {name: "Explore sample home"}));
    expect(screen.getByRole("region", {name: "Sample home details"}).textContent).toContain("No reservation or transaction is available");
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/"]);
    fireEvent.click(screen.getByRole("button", {name: "Unsave demo Cantonments Garden Residence"}));
    expect(screen.getByText("Tap a heart to start your demo shortlist.")).toBeTruthy();
  });
});
