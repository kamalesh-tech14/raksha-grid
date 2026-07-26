"use client";

import { useEffect, useState } from "react";
import { getBestLocation } from "@/lib/geolocation";
import { getShelters, getHospitals, ApiError, type ShelterResponse, type HospitalResponse } from "@/lib/api";

type State = "loading" | "loaded" | "error";

// Real Haversine great-circle distance — not a placeholder number.
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Item {
  id: string;
  kind: "shelter" | "hospital";
  name: string;
  distanceKm: number | null;
  detail: string;
}

export default function NearbyResources() {
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let userLat: number | null = null;
    let userLng: number | null = null;

    getBestLocation(5000)
      .then((pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
      })
      .catch(() => {
        // Distance just won't be shown if location isn't available —
        // the shelter/hospital list itself is still real and useful.
      })
      .finally(() => {
        Promise.all([getShelters(), getHospitals()])
          .then(([shelters, hospitals]: [ShelterResponse[], HospitalResponse[]]) => {
            const shelterItems: Item[] = shelters.map((s) => ({
              id: s.id,
              kind: "shelter",
              name: s.name,
              distanceKm: userLat !== null ? distanceKm(userLat, userLng!, s.latitude, s.longitude) : null,
              detail: `Capacity ${s.occupancy} / ${s.capacity} · ${s.isOpen ? "Open" : "Closed"}`,
            }));
            const hospitalItems: Item[] = hospitals.map((h) => ({
              id: h.id,
              kind: "hospital",
              name: h.name,
              distanceKm: userLat !== null ? distanceKm(userLat, userLng!, h.latitude, h.longitude) : null,
              detail: `${h.emergencyBeds} emergency beds · ${h.isOperational ? "Available" : "Closed"}`,
            }));

            const all = [...shelterItems, ...hospitalItems].sort(
              (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
            );
            setItems(all);
            setState("loaded");
          })
          .catch((err) => {
            setState("error");
            setErrorMsg(err instanceof ApiError ? `Server error (${err.status})` : "Couldn't reach the server");
          });
      });
  }, []);

  return (
    <>
      <div className="mb-2.5 text-xs uppercase tracking-wide text-text-muted">Nearby</div>

      {state === "loading" && (
        <div className="mb-4 space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[52px] animate-pulse rounded-card bg-bg-surface" />
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="mb-4 rounded-card border border-warn-amber/35 bg-warn-amber/10 p-3 text-xs text-warn-amber">
          {errorMsg}
        </div>
      )}

      {state === "loaded" && items.length === 0 && (
        <div className="mb-4 rounded-card border border-border-hairline bg-bg-surface p-3 text-xs text-text-muted">
          No shelters or hospitals in the database yet. Run <code>npm run prisma:seed</code> in{" "}
          <code>services/api</code>.
        </div>
      )}

      {state === "loaded" && items.length > 0 && (
        <div className="mb-4 rounded-card border border-border-hairline bg-bg-surface px-3.5 py-1">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center justify-between py-2 text-sm ${
                i < items.length - 1 ? "border-b border-border-hairline" : ""
              }`}
            >
              <span>
                {item.kind === "shelter" ? "🏠" : "🏥"} {item.name} — {item.detail}
              </span>
              <span className="font-data text-xs text-text-muted">
                {item.distanceKm !== null ? `${item.distanceKm.toFixed(1)} km` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
