"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllQueued, type QueuedSos } from "@/lib/offlineQueue";
import { onQueueChange, retryNow, startSyncEngine } from "@/lib/syncEngine";

const STATUS_LABEL: Record<QueuedSos["status"], { text: string; className: string }> = {
  pending: { text: "Waiting to retry", className: "text-warn-amber" },
  syncing: { text: "Sending…", className: "text-accent-cyan" },
  failed: { text: "Failed — max retries reached", className: "text-danger-red" },
};

export default function OfflinePage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueuedSos[]>([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    getAllQueued().then(setQueue).catch(() => setQueue([]));
    startSyncEngine();

    const unsub = onQueueChange(setQueue);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-bg-void px-5 py-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-4 self-start font-data text-xs text-text-muted"
      >
        ← Back to Home
      </button>

      <h1 className="font-display text-xl font-bold">Offline Emergency Centre</h1>

      <div
        className={`mt-3 mb-5 rounded-card border px-3 py-2 font-data text-xs ${
          online
            ? "border-success-green/40 bg-success-green/10 text-success-green"
            : "border-warn-amber/40 bg-warn-amber/10 text-warn-amber"
        }`}
      >
        {online ? "● Online — queued reports will send automatically" : "○ Offline — reports are stored locally"}
      </div>

      {queue.length === 0 ? (
        <div className="rounded-card border border-border-hairline bg-bg-surface p-4 text-center text-sm text-text-muted">
          No pending reports. Anything you send while offline will show up here, safely stored on this
          device until it can be delivered.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {queue.map((entry) => {
            const label = STATUS_LABEL[entry.status];
            return (
              <li key={entry.id} className="rounded-card border border-border-hairline bg-bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-data text-xs text-text-muted">
                    #{entry.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`font-data text-xs ${label.className}`}>{label.text}</span>
                </div>
                <p className="mt-1.5 text-sm capitalize">{entry.payload.emergencyType.replace(/-/g, " ")}</p>
                <p className="mt-1 font-data text-[11px] text-text-muted">
                  Retry {entry.retryCount} · queued {new Date(entry.createdAt).toLocaleTimeString()}
                  {entry.lastError ? ` · last error: ${entry.lastError}` : ""}
                </p>
                {entry.status !== "syncing" && (
                  <button
                    type="button"
                    onClick={() => retryNow(entry.id)}
                    className="mt-2 font-data text-xs text-accent-cyan underline"
                  >
                    Retry now
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 rounded-card border border-border-hairline bg-bg-surface p-3.5">
        <p className="text-sm font-semibold">Available offline right now</p>
        <ul className="mt-2 space-y-1 font-data text-xs text-text-muted">
          <li>✓ This queue — your reports are safe even with the app closed</li>
          <li>✓ Automatic retry once connection returns</li>
          <li>○ Offline maps, cached shelters, first-aid guides — added in a later phase</li>
        </ul>
      </div>
    </div>
  );
}
