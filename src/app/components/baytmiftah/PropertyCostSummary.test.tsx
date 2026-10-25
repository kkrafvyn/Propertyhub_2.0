import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PropertyCostSummary } from "./PropertyCostSummary";
describe("property price details", () => {
  it("distinguishes unknown charges from a recorded zero fee", () => {
    render(<PropertyCostSummary currency="GHS" price={4500.5} listingType="rental" inspectionFee={0} />);
    expect(screen.getByText("Monthly rent")).toBeTruthy();
    expect(screen.getByText("Not specified")).toBeTruthy();
    expect(screen.getByText("GHS 0")).toBeTruthy();
    expect(screen.getByText("GHS 4,500.5")).toBeTruthy();
  });
  it("shows a deposit separately without inventing a total", () => {
    render(<PropertyCostSummary currency="GHS" price={500} listingType="short_stay" minimumDeposit={100} inspectionFee={20} />);
    expect(screen.getByText("Nightly rate")).toBeTruthy();
    expect(screen.getByText("GHS 100")).toBeTruthy();
    expect(screen.queryByText("GHS 620")).toBeNull();
  });
});
