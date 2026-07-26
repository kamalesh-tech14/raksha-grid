"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSosStatus, formatDeliveryState, ApiError, type SosStatusResponse } from "@/lib/api";
import type { SosDeliveryState } from "@raksha-grid/shared-types";

const POLL_MS = 4000;

// Order matters — used to render a progress list and to grey out states
// not yet reached. Mirrors the state machine enforced server-side in
// services/api/src/sos/sos.service.ts (ALLOWED_TRANSITIONS).
const DISPLAY_ORDER: SosDeliveryState[] = [
  "stored-locally",
  "checking-routes",
  "queued",
  "sending",
  "delivered",
  "acknowledged",
  "rescue-assigned",
  "help-approaching",
  "resolved",
];

const STATE_LABEL: Record<SosDeliveryState, string> = {
  draft: "Draft",
  "collecting-location": "Collecting location",
  "stored-locally": "Stored locally",
  "checking-routes": "Checking communication routes",
  queued: "Queued for delivery",
  sending: "Sending",
  "relay-transferred": "Relayed via nearby device",
  delivered: "Delivered",
  acknowledged: "Acknowledged by rescue centre",
  "rescue-assigned": "Rescue team assigned",
  "help-approaching": "Help approaching",
  resolved: "Resolved",
  "retry-scheduled": "Retry scheduled",
  failed: "Failed",
};

export default function SosStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<SosStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await getSosStatus(params.id);
        if (!cancelled) {
          setStatus(data);
          setError(null);
          const state = formatDeliveryState(data.deliveryState);
          if (state !== "resolved" && state !== "failed") {
            timer = setTimeout(poll, POLL_MS);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? `Could not load status (${err.status ?? "network error"}).`
              : "Could not reach the server."
          );
          timer = setTimeout(poll, POLL_MS);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [params.id]);

  const currentState = status ? formatDeliveryState(status.deliveryState) : null;
  const currentIndex = currentState ? DISPLAY_ORDER.indexOf(currentState) : -1;
  const lastAttempt = status?.deliveryAttempts?.[0];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-bg-void px-5 py-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-4 self-start font-data text-xs text-text-muted"
      >
        ← Back to Home
      </button>

      <div className="mb-5 text-center">
        <p className="font-data text-xs text-text-muted">SOS #{params.id.slice(0, 8).toUpperCase()}</p>
        {status && (
          <span className="mt-2 inline-block rounded-full border border-danger-red/40 bg-danger-red/15 px-3 py-1 font-data text-xs text-danger-red">
            {status.priority}
          </span>
        )}
      </div>

      {!status && !error && (
        <p className="text-center font-data text-sm text-text-muted">Loading real status from the server…</p>
      )}

      {error && !status && (
        <p className="text-center font-data text-sm text-danger-red">{error}</p>
      )}

      {status && (
        <>
          <ol className="relative border-l-2 border-border-hairline pl-6">
            {DISPLAY_ORDER.map((state, idx) => {
              const done = currentIndex > idx;
              const current = currentIndex === idx;
              return (
                <li key={state} className="relative pb-5">
                  <span
                    className={`absolute -left-[29px] top-0.5 h-3.5 w-3.5 rounded-full border-2 ${
                      done
                        ? "border-success-green bg-success-green"
                        : current
                        ? "border-warn-amber bg-warn-amber shadow-[0_0_0_4px_rgba(242,169,60,0.2)]"
                        : "border-text-disabled bg-bg-surface"
                    }`}
                  />
                  <p
                    className={`text-sm font-semibold ${
                      done ? "text-success-green" : current ? "text-warn-amber" : "text-text-disabled"
                    }`}
                  >
                    {STATE_LABEL[state]}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-2 rounded-card border border-border-hairline bg-bg-surface px-3 py-2.5 font-data text-xs text-text-muted">
            {lastAttempt ? (
              <>
                Last attempted route: <b className="text-text-primary">{lastAttempt.route}</b>
                {lastAttempt.simulated && (
                  <span className="ml-1.5 rounded border border-warn-amber/40 px-1 text-[9px] text-warn-amber">
                    SIM
                  </span>
                )}
                <br />
                Retry count: {status.retryCount} · Updated{" "}
                {new Date(status.updatedAt).toLocaleTimeString()}
              </>
            ) : (
              <>No delivery route attempted yet · Updated {new Date(status.updatedAt).toLocaleTimeString()}</>
            )}
          </div>

          {error && (
            <p className="mt-3 text-center font-data text-xs text-warn-amber">
              {error} (still showing last known status — retrying in background)
            </p>
          )}
        </>
      )}
    </div>
  );
}
