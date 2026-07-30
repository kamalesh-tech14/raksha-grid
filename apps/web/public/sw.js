// Minimal, honest service worker: caches static assets and offline fallback.
// For HTML/JS navigation requests: network-first (always try to fetch latest),
// fall back to cache only if offline. For static assets: cache-first.
// This prevents stale app shells from being served when updates are deployed.

const CACHE_NAME = "raksha-grid-shell-v2-2026-07-30";
const APP_SHELL = ["/", "/offline", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isNavigation = event.request.mode === "navigate";
  const isStaticAsset =
    event.request.destination === "image" ||
    event.request.destination === "font" ||
    event.request.destination === "style" ||
    event.request.url.includes("/_next/static/");

  if (isNavigation) {
    // Network-first for HTML pages and JS bundles: always try live first
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match("/"));
        })
    );
  } else if (isStaticAsset) {
    // Cache-first for static assets: use cached if available, update in background
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
  } else {
    // Default: network-first, fall back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || new Response("Offline", { status: 503 }));
        })
    );
  }
});
