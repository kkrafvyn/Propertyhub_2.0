import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "../app/context/ThemeContext";

function TestConsumer() {
  const { theme, resolvedTheme, accent, setTheme, toggleTheme, setAccent } = useTheme();

  return (
    <div>
      <span data-testid="theme-mode">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <span data-testid="accent">{accent}</span>
      <button onClick={() => toggleTheme()} data-testid="toggle-btn">
        Toggle Theme
      </button>
      <button onClick={() => setTheme("dark")} data-testid="set-dark-btn">
        Set Dark
      </button>
      <button onClick={() => setTheme("light")} data-testid="set-light-btn">
        Set Light
      </button>
      <button onClick={() => setTheme("system")} data-testid="set-system-btn">
        Set System
      </button>
      <button onClick={() => setAccent("midnight")} data-testid="set-midnight-btn">
        Set Midnight
      </button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("data-accent");

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // light by default
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("initializes with default system mode and light resolved theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-mode").textContent).toBe("system");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(screen.getByTestId("accent").textContent).toBe("emerald");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.accent).toBe("emerald");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles between light and dark themes", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");

    await user.click(toggleBtn);
    expect(screen.getByTestId("theme-mode").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("baytmiftah_theme")).toBe("dark");

    await user.click(toggleBtn);
    expect(screen.getByTestId("theme-mode").textContent).toBe("light");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("baytmiftah_theme")).toBe("light");
  });

  it("sets specific theme modes and persists to storage", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark-btn"));
    expect(screen.getByTestId("theme-mode").textContent).toBe("dark");
    expect(localStorage.getItem("baytmiftah_theme")).toBe("dark");

    await user.click(screen.getByTestId("set-system-btn"));
    expect(screen.getByTestId("theme-mode").textContent).toBe("system");
    expect(localStorage.getItem("baytmiftah_theme")).toBe("system");
  });

  it("updates palette accent and applies dataset attribute", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-midnight-btn"));
    expect(screen.getByTestId("accent").textContent).toBe("midnight");
    expect(document.documentElement.dataset.accent).toBe("midnight");
    expect(localStorage.getItem("baytmiftah_accent")).toBe("midnight");
  });

  it("restores previously saved theme and accent from localStorage", () => {
    localStorage.setItem("baytmiftah_theme", "dark");
    localStorage.setItem("baytmiftah_accent", "oasis");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-mode").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    expect(screen.getByTestId("accent").textContent).toBe("oasis");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.accent).toBe("oasis");
  });
});
