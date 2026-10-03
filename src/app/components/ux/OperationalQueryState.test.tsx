import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OperationalQueryState } from "./OperationalQueryState";

describe("OperationalQueryState", () => {
  it("shows error with retry and never empty copy on fetch failure", () => {
    const onRetry = vi.fn();
    render(
      <OperationalQueryState
        phase="error"
        errorMessage="Network failed"
        onRetry={onRetry}
        retryLabel="Reload"
        emptyTitle="No items"
        emptyDescription="Add your first item"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Network failed");
    expect(screen.queryByText("No items")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows empty state only when phase is empty", () => {
    render(
      <OperationalQueryState
        phase="empty"
        emptyTitle="No listings"
        emptyDescription="Create a listing to get started."
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No listings");
  });
});
