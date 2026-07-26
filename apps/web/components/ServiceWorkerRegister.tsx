"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure (e.g. unsupported browser, dev-mode quirks)
        // is non-fatal — the app still works online, it just won't have
        // offline app-shell caching. No need to surface this to the user.
      });
    }
  }, []);

  return null;
}
