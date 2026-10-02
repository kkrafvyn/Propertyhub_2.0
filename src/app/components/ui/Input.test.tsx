import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("connects labels, guidance, and validation errors to the field", () => {
    render(
      <Input
        label="Email address"
        description="Use your work email."
        error="Enter a valid email address."
      />,
    );

    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Use your work email. Enter a valid email address.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });
});
