import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register PWA Service Worker for offline resilience & background sync in production only
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration skipped:", err);
      });
    });
  } else {
    // In development mode, unregister leftover service workers and clear caches
    // to prevent Vite module hash mismatches and duplicate React runtime instances.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
