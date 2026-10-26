import { ConnectionStatus } from "./consumer/ConnectionStatus";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router";

/** Shared route-transition UX for keyboard, screen-reader, and touch users. */
export function RouteExperience() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const initialRender = useRef(true);
  const [announcement, setAnnouncement] = useState("");

  const focusMainContent = (scroll: boolean) => {
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    const target = document.querySelector<HTMLElement>("main")
      || document.getElementById("main-content");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (scroll) target.scrollIntoView({ block: "start", behavior: "auto" });
  };

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1));
        target?.scrollIntoView({ block: "start" });
      } else if (navigationType !== "POP" && !document.querySelector('[role="dialog"][data-state="open"]')) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      focusMainContent(false);
      const pageHeading = document.querySelector<HTMLElement>("h1");
      setAnnouncement(pageHeading?.innerText.trim() || document.title || "Page loaded");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, location.search, navigationType]);

  return (
    <>
      {!location.pathname.startsWith("/workspace") && !location.pathname.startsWith("/admin") && <ConnectionStatus />}
      <a
        className="skip-to-content"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          focusMainContent(true);
        }}
      >
        Skip to main content
      </a>
      <div id="route-focus-sink" tabIndex={-1} className="route-focus-sink" aria-hidden="true" />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </>
  );
}
