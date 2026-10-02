import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionDialog } from "./ActionDialog";

describe("ActionDialog", () => {
  it("requires an audit note before confirming a destructive action", () => {
    const onConfirm = vi.fn();
    const onNotesChange = vi.fn();
    const { rerender } = render(
      <ActionDialog
        open
        onOpenChange={() => undefined}
        title="Reject request?"
        description="This records a rejection."
        confirmLabel="Reject"
        tone="destructive"
        notesLabel="Reason"
        notesRequired
        notes=""
        onNotesChange={onNotesChange}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Missing document" } });
    expect(onNotesChange).toHaveBeenCalledWith("Missing document");

    rerender(
      <ActionDialog
        open
        onOpenChange={() => undefined}
        title="Reject request?"
        description="This records a rejection."
        confirmLabel="Reject"
        tone="destructive"
        notesLabel="Reason"
        notesRequired
        notes="Missing document"
        onNotesChange={onNotesChange}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
