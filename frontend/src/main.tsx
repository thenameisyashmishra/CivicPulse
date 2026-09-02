import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register PWA Service Worker for offline resilience & background sync
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("ServiceWorker registration skipped:", err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
