
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { registerAppServiceWorker } from "./lib/pwa";
import "./styles/index.css";

function mountApp() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;
  createRoot(rootEl).render(<App />);
  registerAppServiceWorker();
}

async function bootstrap() {
  try {
    await Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          resolve();
          return;
        }
        window.addEventListener("load", () => resolve(), { once: true });
      }),
    ]);
  } catch {
    // Mount even if readiness checks fail.
  }

  mountApp();
}

void bootstrap();
