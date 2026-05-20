
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { registerAppServiceWorker } from "./lib/pwa";
import "leaflet/dist/leaflet.css";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);

registerAppServiceWorker();
  
