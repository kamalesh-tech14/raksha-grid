const STORAGE_KEY = "raksha-grid:device-id";

/**
 * Real device identity is normally a hashed hardware/installation id.
 * For the web prototype, a persisted random UUID in localStorage is the
 * honest equivalent — stable across visits, not tied to anything personal.
 * Native mobile (Phase 4 mobile app, later) will use a proper secure
 * device id instead of this.
 */
export function getOrCreateDeviceIdHash(): string {
  if (typeof window === "undefined") return "server-render-placeholder";

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
