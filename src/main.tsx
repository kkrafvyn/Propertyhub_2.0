
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { registerAppServiceWorker } from "./lib/pwa";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);

registerAppServiceWorker();
  
