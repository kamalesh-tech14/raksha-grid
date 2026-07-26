import type { LocationSource } from "@raksha-grid/shared-types";

export interface CapturedLocation {
  latitude?: number;
  longitude?: number;
  accuracyMetres?: number;
  altitudeMetres?: number;
  locationSource: LocationSource;
  locationCapturedAt?: string;
}

/**
 * A single getCurrentPosition() call often returns a fast-but-bad first
 * fix (network/IP estimate) before the real GPS chip locks on. This
 * watches for up to `windowMs` and keeps whichever reading had the
 * smallest (best) accuracy value — a real, standard technique for
 * improving GPS quality on mobile, not a trick. Falls back to whatever
 * it has if the window runs out without a great fix.
 */
export function getBestLocation(windowMs = 8000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({ code: 0, message: "This browser has no geolocation support" });
      return;
    }

    let best: GeolocationPosition | null = null;
    let settled = false;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) {
          best = pos;
        }
        // A fix under 30m is already excellent — no need to keep waiting.
        if (pos.coords.accuracy < 30 && !settled) {
          settled = true;
          navigator.geolocation.clearWatch(watchId);
          resolve(pos);
        }
      },
      (err) => {
        if (!best && !settled) {
          settled = true;
          navigator.geolocation.clearWatch(watchId);
          const messages: Record<number, string> = {
            1: "Permission denied. Click the lock/info icon in the address bar → Site settings → Location → Allow, then try again.",
            2: "Position unavailable — your device could not determine a location right now.",
            3: "Location request timed out — try again.",
          };
          reject({ code: err.code, message: messages[err.code] ?? err.message });
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: windowMs }
    );

    setTimeout(() => {
      if (!settled) {
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        if (best) resolve(best);
        else reject({ code: 2, message: "No location fix within the time window" });
      }
    }, windowMs);
  });
}

export interface PreciseLocationError {
  code: number;
  message: string;
}

const GPS_TIMEOUT_MS = 6000;

/**
 * Unlike captureLocation() (used for SOS, which must never block on GPS
 * failing — it silently falls back so the emergency report still gets
 * created), this is for UI contexts like the risk map where the person
 * genuinely needs to know WHY their location didn't show up. Silently
 * failing here is exactly the bug that made location "not show" with no
 * explanation — this rejects with the real, specific browser error
 * instead of hiding it.
 */
export function getPreciseLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({ code: 0, message: "This browser has no geolocation support" });
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const messages: Record<number, string> = {
        1: 'Permission denied. Click the lock/info icon in the address bar → Site settings → Location → Allow, then try again.',
        2: "Position unavailable — your device could not determine a location right now.",
        3: "Location request timed out — try again.",
      };
      reject({ code: err.code, message: messages[err.code] ?? err.message });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
}

/**
 * Real geolocation via the browser API — not simulated. Follows the
 * fallback order from docs/PHASE-1-PRODUCT-DEFINITION.md §11: fresh GPS
 * fix first, and if that fails (denied, unavailable, or times out), the
 * SOS still gets created with locationSource "manual-map" left for the
 * user to set — this function never blocks SOS creation on GPS succeeding.
 */
export function captureLocation(): Promise<CapturedLocation> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ locationSource: "manual-map" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMetres: pos.coords.accuracy,
          altitudeMetres: pos.coords.altitude ?? undefined,
          locationSource: "live-gps",
          locationCapturedAt: new Date(pos.timestamp).toISOString(),
        });
      },
      () => {
        // Permission denied or position unavailable — store the SOS
        // anyway per the "if location cannot be obtained, still store the
        // SOS" rule. Real "last known location" persistence (from a prior
        // successful fix) is added when the offline queue lands in Phase 5.
        resolve({ locationSource: "manual-map" });
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 }
    );
  });
}
