import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NativeSelect } from "./NativeSelect";

describe("NativeSelect", () => {
  it("connects its label, guidance, and error message", () => {
    render(
      <NativeSelect label="Provider" description="Choose the verification provider." error="Provider is required.">
        <option value="">Choose one</option>
      </NativeSelect>,
    );

    const select = screen.getByLabelText("Provider");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription(
      "Choose the verification provider. Provider is required.",
    );
  });
});
