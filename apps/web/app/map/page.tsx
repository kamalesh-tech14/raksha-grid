"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

// Leaflet touches `window` at import time, so it must never run during
// server-side rendering — ssr:false is required here, not optional.
const RiskMap = dynamic(() => import("@/components/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-data text-xs text-text-muted">
      Loading map…
    </div>
  ),
});

export default function MapPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-bg-void">
      <header className="safe-top flex items-center justify-between px-5 pb-3 pt-3">
        <button type="button" onClick={() => router.push("/")} className="font-data text-xs text-text-muted">
          ← Back
        </button>
        <span className="font-display text-sm font-semibold">Live Risk Map</span>
        <span className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <RiskMap />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border-hairline bg-bg-surface-raised px-4 py-2.5 font-data text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#3AD1F2" }} /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#F2A93C" }} /> Risk zone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#2ED9A0" }} /> Shelter
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#4C7CFF" }} /> Hospital
        </span>
      </div>

      <BottomNav />
    </div>
  );
}
