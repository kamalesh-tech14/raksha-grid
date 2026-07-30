"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSos, readNetworkState, ApiError } from "@/lib/api";
import { getOrCreateDeviceIdHash } from "@/lib/device";
import { captureLocation } from "@/lib/geolocation";
import { enqueueSos } from "@/lib/offlineQueue";
import { startSyncEngine } from "@/lib/syncEngine";
import type { EmergencyType } from "@raksha-grid/shared-types";

const CONFIRM_TIMEOUT_MS = 3000;
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

export default function SosButton({ ambientSeverity = "watch" }: SosButtonProps) {
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EmergencyType>("other");
  const [confirming, setConfirming] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!confirming) return;

    setConfirmCountdown(3);
    let remaining = 3;

    confirmTimerRef.current = setInterval(() => {
      remaining -= 1;
      setConfirmCountdown(remaining);
      if (remaining <= 0) {
        if (confirmTimerRef.current) {
          clearInterval(confirmTimerRef.current);
          confirmTimerRef.current = null;
        }
        setConfirming(false);
      }
    }, 1000);

    return () => {
      if (confirmTimerRef.current) {
        clearInterval(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    };
  }, [confirming]);

  const handleSosClick = useCallback(() => {
    if (submitState === "submitting") return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    // Second tap within 3 seconds — submit
    setConfirming(false);
    if (confirmTimerRef.current) {
      clearInterval(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    void submitSos();
  }, [confirming, submitState]);

  const handleCancel = useCallback(() => {
    setConfirming(false);
    if (confirmTimerRef.current) {
      clearInterval(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  }, []);

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

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelectedType(opt.value)}
            disabled={submitState === "submitting" || confirming}
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
        {/* Ambient ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${
            confirming
              ? "border-warn-amber"
              : submitState === "error" || submitState === "queued"
              ? "border-warn-amber opacity-90"
              : ringColor[ambientSeverity]
          } ${confirming ? "" : "motion-safe:animate-pulse-ring"}`}
          aria-hidden="true"
        />

        {/* Confirmation countdown ring */}
        {confirming && (
          <svg width={88} height={88} className="absolute z-[3] -rotate-90" aria-hidden="true">
            <circle cx={44} cy={44} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
            <circle
              cx={44}
              cy={44}
              r={RADIUS}
              fill="none"
              stroke="#ffd35c"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - (CIRCUMFERENCE * (3 - confirmCountdown)) / 3}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
        )}

        <button
          type="button"
          disabled={submitState === "submitting"}
          onClick={handleSosClick}
          aria-label={confirming ? "Tap again to confirm SOS" : "Tap to send an emergency SOS"}
          className={`z-[2] flex h-[88px] w-[88px] select-none items-center justify-center rounded-full font-display text-[17px] font-bold text-white shadow-sos transition-transform active:scale-95 disabled:opacity-80 ${
            submitState === "submitting"
              ? "bg-[radial-gradient(circle_at_35%_30%,#ffd35c,theme(colors.warn-amber))]"
              : confirming
              ? "bg-[radial-gradient(circle_at_35%_30%,#ffd35c,theme(colors.warn-amber))]"
              : "bg-[radial-gradient(circle_at_35%_30%,#ff6b78,theme(colors.danger-red))]"
          }`}
          style={{
            userSelect: "none",
          }}
        >
          {submitState === "submitting"
            ? "…"
            : confirming
            ? confirmCountdown
            : "SOS"}
        </button>
      </div>

      <p className="mt-3 text-center font-data text-xs text-text-muted" role="status">
        {submitState === "submitting"
          ? "Getting your location and sending…"
          : submitState === "queued"
          ? statusMessage
          : confirming
          ? `${confirmCountdown}s — Tap again to confirm`
          : "Tap once, then tap again to confirm"}
      </p>
      {confirming && (
        <button
          type="button"
          onClick={handleCancel}
          className="mt-1 font-data text-xs text-accent-cyan underline"
        >
          Cancel
        </button>
      )}
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
