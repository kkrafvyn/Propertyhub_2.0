import { supabase } from "./supabase";

type MonitoringPayload = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const errorReportingUrl = import.meta.env.VITE_ERROR_REPORTING_URL?.trim() || "";
const errorReportingEnabled = import.meta.env.VITE_ENABLE_ERROR_REPORTING === "true";

async function postMonitoringPayload(path: string, payload: MonitoringPayload) {
  if (!errorReportingEnabled || !errorReportingUrl) return;

  try {
    await fetch(`${errorReportingUrl.replace(/\/$/, "")}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        app: "baytmiftah",
        environment: import.meta.env.MODE,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[monitor] external reporting failed", error);
    }
  }
}

export const monitoring = {
  trackEvent(eventName: string, payload: MonitoringPayload = {}) {
    if (import.meta.env.DEV) {
      console.info(`[monitor] ${eventName}`, payload);
    }

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
    } else if (typeof window !== "undefined") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...payload });
    }

    void postMonitoringPayload("events", { event: eventName, ...payload });
  },

  captureError(error: unknown, context?: string) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    // Built-in app health: record safe categories for signed-in sessions. Raw
    // error messages/stacks may contain user data and stay out of this feed.
    const category = context === "window.error" || context === "window.unhandledrejection"
      ? context : context?.includes("\n") || context === "react-boundary" ? "react-boundary" : "application";
    void Promise.resolve().then(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.rpc("record_client_error", { p_context: category });
    }).catch(() => undefined);

    this.trackEvent("app_error", {
      context: context || "unknown",
      message,
    });

    void postMonitoringPayload("errors", {
      context: context || "unknown",
      message,
      stack,
    });

    if (import.meta.env.DEV) {
      console.error(`[monitor:error${context ? `:${context}` : ""}]`, error);
    }
  },

  trackPageView(path: string) {
    this.trackEvent("page_view", { path });
  },

  trackWorkflowStep(workflow: string, step: string, metadata?: MonitoringPayload) {
    this.trackEvent("workflow_step", { workflow, step, ...metadata });
  },

  trackHealthPing(details: MonitoringPayload = {}) {
    this.trackEvent("health_ping", {
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      ...details,
    });
  },
};
