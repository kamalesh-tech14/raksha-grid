"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { getPredictions, ApiError, type PredictionResponse } from "@/lib/api";

type Tier = "critical" | "warning" | "advisory";

function tierFor(severity: string): Tier {
  if (severity === "critical" || severity === "severe") return "critical";
  if (severity === "high") return "warning";
  return "advisory";
}

const tierMeta: Record<Tier, { label: string; color: string; icon: string }> = {
  critical: { label: "Critical", color: "text-danger-red", icon: "🔴" },
  warning: { label: "Warning", color: "text-warn-amber", icon: "🟠" },
  advisory: { label: "Advisory", color: "text-accent-cyan", icon: "🔵" },
};

export default function AlertsPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error" | "empty">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getPredictions("chennai-poonamallee")
      .then((preds) => {
        setPredictions(preds);
        setState(preds.length === 0 ? "empty" : "loaded");
      })
      .catch((err) => {
        setState("error");
        setErrorMsg(err instanceof ApiError ? `Server error (${err.status})` : "Couldn't reach the server");
      });
  }, []);

  const grouped: Record<Tier, PredictionResponse[]> = { critical: [], warning: [], advisory: [] };
  predictions.forEach((p) => grouped[tierFor(p.severity)].push(p));

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-bg-void">
      <header className="safe-top flex items-center justify-between px-5 pb-3 pt-3">
        <button type="button" onClick={() => router.push("/")} className="font-data text-xs text-text-muted">
          ← Back
        </button>
        <span className="font-display text-sm font-semibold">Alerts</span>
        <span className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        {state === "loading" && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-bg-surface" />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="rounded-card border border-warn-amber/35 bg-warn-amber/10 p-3 text-xs text-warn-amber">
            {errorMsg}
          </div>
        )}

        {state === "empty" && (
          <div className="rounded-card border border-border-hairline bg-bg-surface p-3 text-xs text-text-muted">
            No active alerts right now. Run <code>npm run prisma:seed</code> in <code>services/api</code> to
            load demonstration data.
          </div>
        )}

        {state === "loaded" &&
          (["critical", "warning", "advisory"] as Tier[]).map((tier) =>
            grouped[tier].length === 0 ? null : (
              <div key={tier} className="mb-4">
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${tierMeta[tier].color}`}>
                  {tierMeta[tier].label}
                </p>
                {grouped[tier].map((p) => (
                  <div
                    key={p.id}
                    className="mb-2 flex gap-2.5 rounded-card border border-border-hairline bg-bg-surface p-3"
                  >
                    <span>{tierMeta[tier].icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize">
                        {p.disasterType} — {p.regionName}
                      </p>
                      <p className="mt-0.5 font-data text-[11px] text-text-muted">
                        Issued by {p.dataSourceLabel} · expires{" "}
                        {new Date(p.validUntil).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-text-primary">
                        {Math.round(p.probability * 100)}% probability · {Math.round(p.confidence * 100)}%
                        confidence
                      </p>
                      {p.isDemonstrationData && (
                        <span className="mt-1 inline-block rounded-md border border-border-hairline px-1.5 py-0.5 font-data text-[10px] text-text-disabled">
                          DEMO DATA
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
      </main>

      <BottomNav />
    </div>
  );
}
