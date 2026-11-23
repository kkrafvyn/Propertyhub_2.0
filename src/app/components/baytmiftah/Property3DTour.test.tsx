import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Property3DTour } from "./Property3DTour";

describe("Property3DTour", () => {
  it("does not show an iframe or a tour label when no valid tour exists", () => {
    const { container, rerender } = render(<Property3DTour propertyName="Osu home" tourUrl={null} />);
    expect(container.firstChild).toBeNull();
    rerender(<Property3DTour propertyName="Osu home" tourUrl="https://evil.example/drive-by" />);
    expect(container.firstChild).toBeNull();
  });

  it("opens the real 3D tour only after explicit consent and stops it", async () => {
    const user = userEvent.setup();
    render(<Property3DTour propertyName="Osu home" tourUrl="https://my.matterport.com/show/?m=AbCdEf12345&utm_campaign=x" />);
    expect(screen.queryByTitle(/Interactive 3D tour of Osu home/)).not.toBeInTheDocument();
    const openExternal = screen.getByRole("link", { name: /Open full tour/ });
    expect(openExternal).toHaveAttribute("href", "https://my.matterport.com/show/?m=AbCdEf12345");
    expect(openExternal).toHaveAttribute("rel", "noopener noreferrer");
    await user.click(screen.getByRole("button", { name: "Start 3D tour" }));
    const iframe = screen.getByTitle("Interactive 3D tour of Osu home");
    expect(iframe).toHaveAttribute("src", "https://my.matterport.com/show/?m=AbCdEf12345");
    expect(iframe).toHaveAttribute("sandbox", expect.stringContaining("allow-scripts"));
    await user.click(screen.getByRole("button", { name: "Stop tour" }));
    expect(screen.queryByTitle("Interactive 3D tour of Osu home")).not.toBeInTheDocument();
  });
});
