type MonitoringPayload = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const monitoring = {
  trackEvent(eventName: string, payload: MonitoringPayload = {}) {
    if (import.meta.env.DEV) {
      console.info(`[monitor] ${eventName}`, payload);
    }

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
      return;
    }

    if (typeof window !== "undefined") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...payload });
    }
  },

  captureError(error: unknown, context?: string) {
    const message = error instanceof Error ? error.message : String(error);
    this.trackEvent("app_error", {
      context: context || "unknown",
      message,
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
};
