"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSos, readNetworkState, ApiError } from "@/lib/api";
import { getOrCreateDeviceIdHash } from "@/lib/device";
import { captureLocation } from "@/lib/geolocation";
import { enqueueSos } from "@/lib/offlineQueue";
import { startSyncEngine } from "@/lib/syncEngine";
import type { EmergencyType } from "@raksha-grid/shared-types";

const HOLD_MS = 2400;
const RADIUS = 39;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TYPE_OPTIONS: { value: EmergencyType; label: string; icon: string }[] = [
  { value: "trapped", label: "Trapped", icon: "🚧" },
  { value: "medical", label: "Medical", icon: "🩺" },
  { value: "flood", label: "Flood", icon: "🌊" },
  { value: "fire", label: "Fire", icon: "🔥" },
  { value: "other", label: "Other", icon: "❗" },
];

export type RiskSeverity = "normal" | "watch" | "critical";
type SubmitState = "idle" | "submitting" | "queued" | "error";

const ringColor: Record<RiskSeverity, string> = {
  normal: "border-accent-cyan",
  watch: "border-warn-amber",
  critical: "border-danger-red",
};

interface SosButtonProps {
  /** Current highest regional risk severity — drives the ambient Pulse Ring colour. */
  ambientSeverity?: RiskSeverity;
}

/**
 * The Pulse Ring is the platform's signature element (see
 * docs/PHASE-2-DESIGN-SYSTEM.md §1 "Signature element"): it doubles as an
 * always-on ambient risk indicator and freezes solid the instant an SOS
 * hold completes, giving unambiguous "your press registered" feedback.
 *
 * As of Phase 5: if sending fails (or the device is already offline), this
 * genuinely stores the SOS in IndexedDB via lib/offlineQueue and starts the
 * real retry engine (lib/syncEngine) — "stored locally, will retry" is no
 * longer just a message, it's an actual queued record that survives a page
 * refresh. See app/offline for where queued reports are visible/retryable.
 */
export default function SosButton({ ambientSeverity = "watch" }: SosButtonProps) {
  const router = useRouter();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EmergencyType>("other");
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;
  }, []);

  const cancelHold = useCallback(() => {
    stopLoop();
    setHolding(false);
    setProgress(0);
    document.removeEventListener("contextmenu", preventContextMenu);
  }, [stopLoop]);

  const submitSos = useCallback(async () => {
    setSubmitState("submitting");
    setStatusMessage(null);

    const [location, networkState] = await Promise.all([
      captureLocation(),
      Promise.resolve(readNetworkState()),
    ]);

    const payload = {
      idempotencyKey: crypto.randomUUID(),
      deviceIdHash: getOrCreateDeviceIdHash(),
      emergencyType: selectedType,
      peopleAffected: 1,
      networkState,
      ...location,
    };

    // Already offline — don't waste time waiting on a fetch that will
    // certainly fail. Queue immediately.
    if (!networkState.online) {
      await enqueueSos(payload);
      startSyncEngine();
      setSubmitState("queued");
      setStatusMessage("No connection — stored locally, will send automatically");
      return;
    }

    try {
      const incident = await createSos(payload);
      setSubmitState("idle");
      router.push(`/sos/${incident.id}`);
    } catch (err) {
      // The request genuinely failed (server down, DNS, timeout, etc.) —
      // this is exactly the case Phase 4 could only show an error for.
      // Now it really queues instead.
      await enqueueSos(payload);
      startSyncEngine();
      setSubmitState("queued");
      setStatusMessage(
        err instanceof ApiError
          ? `Server unreachable (${err.status ?? "network error"}) — stored locally, will retry`
          : "Couldn't reach the server — stored locally, will retry"
      );
    }
  }, [router, selectedType]);

  const activate = useCallback(() => {
    stopLoop();
    setHolding(false);
    setProgress(0);
    document.removeEventListener("contextmenu", preventContextMenu);
    void submitSos();
  }, [stopLoop, submitSos]);

  const startHold = useCallback(() => {
    if (submitState === "submitting") return;
    setStatusMessage(null);
    setHolding(true);
    startRef.current = performance.now();
    document.addEventListener("contextmenu", preventContextMenu, { passive: false });

    const tick = (now: number) => {
      if (startRef.current === null) return;
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / HOLD_MS, 1);
      setProgress(pct);
      if (pct >= 1) {
        activate();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [activate, submitState]);

  const preventContextMenu = (e: Event) => {
    e.preventDefault();
  };

  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      startHold();
    };

    const handleTouchEnd = () => {
      cancelHold();
    };

    const handleTouchCancel = () => {
      cancelHold();
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    btn.addEventListener("touchstart", handleTouchStart, { passive: false });
    btn.addEventListener("touchend", handleTouchEnd, { passive: false });
    btn.addEventListener("touchcancel", handleTouchCancel, { passive: false });
    btn.addEventListener("contextmenu", handleContextMenu, { passive: false });
    btn.addEventListener("selectstart", handleSelectStart, { passive: false });

    return () => {
      btn.removeEventListener("touchstart", handleTouchStart);
      btn.removeEventListener("touchend", handleTouchEnd);
      btn.removeEventListener("touchcancel", handleTouchCancel);
      btn.removeEventListener("contextmenu", handleContextMenu);
      btn.removeEventListener("selectstart", handleSelectStart);
    };
  }, [startHold, cancelHold]);

  const ringClass =
    submitState === "error" || submitState === "queued"
      ? "border-warn-amber opacity-90"
      : ringColor[ambientSeverity];

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelectedType(opt.value)}
            disabled={submitState === "submitting"}
            className={`rounded-full border px-2.5 py-1 font-data text-[11px] ${
              selectedType === opt.value
                ? "border-danger-red/50 bg-danger-red/15 text-danger-red"
                : "border-border-hairline text-text-muted"
            }`}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      <div className="relative flex h-[118px] w-[118px] items-center justify-center">
        {/* Ambient / confirmation ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${ringClass} ${
            holding || submitState !== "idle" ? "" : "motion-safe:animate-pulse-ring"
          }`}
          aria-hidden="true"
        />

        {/* Hold-progress ring, only visible while holding */}
        {holding && (
          <svg width={88} height={88} className="absolute z-[3] -rotate-90" aria-hidden="true">
            <circle cx={44} cy={44} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
            <circle
              cx={44}
              cy={44}
              r={RADIUS}
              fill="none"
              stroke="#fff"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - CIRCUMFERENCE * progress}
            />
          </svg>
        )}

        <div
          ref={buttonRef}
          role="button"
          tabIndex={0}
          aria-label="Hold for 2 to 3 seconds to send an emergency SOS"
          style={{
            display: "flex",
            height: "88px",
            width: "88px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            zIndex: 2,
            fontFamily: "var(--font-space-grotesk)",
            fontSize: "17px",
            fontWeight: 700,
            color: "white",
            boxShadow: "0 0 20px rgba(255,107,120,0.6)",
            transitionProperty: "transform",
            transitionDuration: "150ms",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            touchAction: "none",
            outline: "none",
            cursor: submitState === "submitting" ? "default" : "pointer",
            opacity: submitState === "submitting" ? 0.8 : 1,
            backgroundImage:
              holding
                ? "radial-gradient(circle at 35% 30%, #ffd35c, #f2a93c)"
                : "radial-gradient(circle at 35% 30%, #ff6b78, #ff4d5e)",
          }}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
        >
          <span style={{ pointerEvents: "none" }}>
            {submitState === "submitting" ? "…" : "SOS"}
          </span>
        </div>
      </div>

      <p className="mt-3 text-center font-data text-xs text-text-muted" role="status">
        {submitState === "submitting"
          ? "Getting your location and sending…"
          : submitState === "queued"
          ? statusMessage
          : holding
          ? "Keep holding… release to cancel"
          : "Hold 2–3s to send emergency SOS"}
      </p>
      {submitState === "queued" && (
        <button
          type="button"
          onClick={() => router.push("/offline")}
          className="mt-1 font-data text-xs text-accent-cyan underline"
        >
          View offline queue
        </button>
      )}
    </div>
  );
}
