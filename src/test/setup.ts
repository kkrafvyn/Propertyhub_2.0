import * as React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("motion/react", () => {
  function stripMotionProps(props: Record<string, unknown>) {
    const nextProps = { ...props };

    delete nextProps.animate;
    delete nextProps.exit;
    delete nextProps.initial;
    delete nextProps.transition;
    delete nextProps.whileHover;
    delete nextProps.whileTap;

    return nextProps;
  }

  const MotionButton = React.forwardRef<HTMLButtonElement, any>((props, ref) =>
    React.createElement("button", { ref, ...stripMotionProps(props) }, props.children)
  );
  const MotionDiv = React.forwardRef<HTMLDivElement, any>((props, ref) =>
    React.createElement("div", { ref, ...stripMotionProps(props) }, props.children)
  );

  MotionButton.displayName = "MotionButton";
  MotionDiv.displayName = "MotionDiv";

  return {
    motion: {
      button: MotionButton,
      div: MotionDiv,
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, "open", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(navigator, "share", {
  configurable: true,
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserver,
});
