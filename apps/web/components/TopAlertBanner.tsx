"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPredictions, type PredictionResponse } from "@/lib/api";

const severityRank: Record<string, number> = { critical: 5, severe: 4, high: 3, moderate: 2, low: 1 };

export default function TopAlertBanner() {
  const [top, setTop] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    getPredictions("chennai-poonamallee")
      .then((preds) => {
        if (preds.length === 0) return;
        const sorted = [...preds].sort(
          (a, b) => (severityRank[b.severity] ?? 0) - (severityRank[a.severity] ?? 0)
        );
        setTop(sorted[0] ?? null);
      })
      .catch(() => {
        // Silent here on purpose — RiskToday already surfaces the fetch
        // error prominently below; duplicating it in this banner too
        // would just repeat the same message twice on one screen.
      });
  }, []);

  if (!top || (top.severity !== "high" && top.severity !== "severe" && top.severity !== "critical")) {
    return null;
  }

  const hoursUntil = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));

  return (
    <Link
      href="/alerts"
      className="mb-4 flex items-start gap-2.5 rounded-card border border-warn-amber/35 bg-gradient-to-r from-warn-amber/15 to-warn-amber/5 p-3"
      role="alert"
    >
      <span className="text-warn-amber" aria-hidden="true">
        ⚠
      </span>
      <div>
        <p className="text-sm font-semibold capitalize">
          {top.disasterType} watch — {top.regionName}
        </p>
        <p className="mt-0.5 font-data text-xs text-text-muted">
          Expires in {hoursUntil(top.validUntil)}h · tap for details
        </p>
      </div>
    </Link>
  );
}
