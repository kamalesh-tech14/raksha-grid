"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBestLocation } from "@/lib/geolocation";
import { reverseGeocodeVerified, type VerifiedAddress } from "@/lib/api";

type Status = "idle" | "locating" | "found" | "error";

/**
 * Real GPS + real reverse geocoding for the Home screen, using the SAME
 * best-fix-watching + dual-geocoder-verification pipeline as the Map
 * screen (components/RiskMap.tsx) — these two screens had drifted apart
 * (Map got upgraded after the Mannarkudi/Mappedu accuracy issue, Home
 * didn't), which meant Home could still show a wrong city. Fixed by
 * reusing the exact same lib/api.ts + lib/geolocation.ts functions.
 */
export default function SafetyStatusHero() {
  const [status, setStatus] = useState<Status>("idle");
  const [address, setAddress] = useState<VerifiedAddress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  function locate() {
    setStatus("locating");
    setErrorMsg(null);

    getBestLocation(6000)
      .then((pos) => {
        setStatus("found");
        setUpdatedAt(new Date());
        return reverseGeocodeVerified(pos.coords.latitude, pos.coords.longitude);
      })
      .then((result) => setAddress(result))
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err?.message ?? "Location unavailable");
      });
  }

  useEffect(() => {
    locate();
  }, []);

  const locationLabel =
    status === "found" && address
      ? [address.primary.area, address.primary.city].filter(Boolean).join(" · ") ||
        address.primary.city ||
        "Location found, area unnamed"
      : null;

  return (
    <div className="mb-4 rounded-card border border-success-green/35 bg-gradient-to-br from-success-green/15 to-success-green/5 p-3.5">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full bg-success-green shadow-[0_0_8px_theme(colors.success-green)]"
          aria-hidden="true"
        />
        <span className="font-display text-lg font-bold text-success-green">Safe</span>
      </div>

      {status === "locating" && (
        <p className="mt-2 font-data text-xs text-text-muted">📍 Getting your best GPS fix…</p>
      )}

      {status === "found" && (
        <>
          <p className="mt-1.5 text-sm text-text-primary">📍 {locationLabel}</p>
          {address && !address.agree && (
            <p className="mt-1 font-data text-[11px] text-warn-amber">
              ⚠ Two location sources disagree —{" "}
              <Link href="/map" className="underline">
                verify or correct on the map
              </Link>
            </p>
          )}
        </>
      )}

      {status === "error" && (
        <div className="mt-1.5">
          <p className="font-data text-xs text-warn-amber">⚠ Location unavailable — {errorMsg}</p>
          <button type="button" onClick={locate} className="mt-1 font-data text-xs text-accent-cyan underline">
            Try again
          </button>
        </div>
      )}

      <p className="mt-1 font-data text-xs text-text-muted">
        {status === "found" && updatedAt ? `Last updated ${updatedAt.toLocaleTimeString()}` : "Not yet located"}
      </p>
    </div>
  );
}
