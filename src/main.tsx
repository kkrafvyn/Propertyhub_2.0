
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { getMobileAppId } from "./lib/mobile-app";
import { registerAppServiceWorker } from "./lib/pwa";
import "./styles/index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  document.documentElement.dataset.mobileApp = getMobileAppId();
  createRoot(rootEl).render(<App />);
  registerAppServiceWorker();
}
