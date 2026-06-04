import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { NotFound } from "./NotFound";

describe("NotFound", () => {
  it("renders the luxury off-market 404 experience", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText("Obsidian Estate")).toBeInTheDocument();
    expect(screen.getByText("Lost?")).toBeInTheDocument();
    expect(screen.getByText(/property you're looking for is off-market/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /start new search/i })).toHaveAttribute(
      "href",
      "/search"
    );
    expect(screen.getByRole("searchbox", { name: /quick search/i })).toHaveAttribute(
      "placeholder",
      "Location, ZIP, or Property Type"
    );
    expect(screen.getByText("The Obsidian Heights")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });
});
