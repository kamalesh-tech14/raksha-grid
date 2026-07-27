"use client";

import { useEffect, useState } from "react";
import RiskCard, { type RiskLevel } from "./RiskCard";
import { getPredictions, ApiError, type PredictionResponse } from "@/lib/api";

// Maps a backend disasterType string to the visual category RiskCard
// already knows how to render. Anything not in this map still renders —
// it just falls back to the neutral "rain" colour treatment rather than
// being silently dropped, since a real prediction feed will introduce
// types (cyclone, wildfire, etc.) before the UI has bespoke styling for
// each one.
const TYPE_TO_LEVEL: Record<string, RiskLevel> = {
  flood: "flood",
  rain: "rain",
  heatwave: "heat",
};

type LoadState = "loading" | "loaded" | "error" | "empty";

export default function RiskToday() {
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getPredictions("chennai-poonamallee");
        if (cancelled) return;
        setPredictions(data);
        setState(data.length === 0 ? "empty" : "loaded");
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setErrorMsg(err instanceof ApiError ? `Server error (${err.status})` : "Couldn't reach the server");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mb-4">
      <div className="mb-2.5 flex items-center gap-2 text-xs uppercase tracking-wide text-text-muted">
        Risk today
        {state === "loaded" && predictions.some((p) => p.isDemonstrationData) && (
          <span className="rounded-md border border-border-hairline px-1.5 py-0.5 font-data text-[10px] text-text-disabled">
            DEMO DATA
          </span>
        )}
      </div>

      {state === "loading" && (
        <div className="flex gap-2.5 pb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[92px] min-w-[104px] animate-pulse rounded-card bg-bg-surface" />
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="rounded-card border border-warn-amber/35 bg-warn-amber/10 p-3 text-xs text-warn-amber">
          {errorMsg} — showing no live risk data right now. Check that the API is running.
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-card border border-border-hairline bg-bg-surface p-3 text-xs text-text-muted">
          No active predictions for this region. Run <code>npm run prisma:seed</code> in{" "}
          <code>services/api</code> to load demonstration data.
        </div>
      )}

      {state === "loaded" && (
        <div className="mb-1 flex gap-2.5 overflow-x-auto pb-3">
          {predictions.map((p) => (
            <RiskCard
              key={p.id}
              level={TYPE_TO_LEVEL[p.disasterType] ?? "rain"}
              label={p.disasterType === "heatwave" ? "Heatwave" : p.disasterType.charAt(0).toUpperCase() + p.disasterType.slice(1)}
              probabilityPct={Math.round(p.probability * 100)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
