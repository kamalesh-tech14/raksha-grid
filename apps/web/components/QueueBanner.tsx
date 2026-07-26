"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllQueued } from "@/lib/offlineQueue";
import { onQueueChange, startSyncEngine } from "@/lib/syncEngine";

export default function QueueBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    startSyncEngine();
    getAllQueued().then((q) => setCount(q.length)).catch(() => setCount(0));
    return onQueueChange((q) => setCount(q.length));
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/offline"
      className="mb-4 flex items-center justify-between rounded-card border border-warn-amber/35 bg-warn-amber/10 px-3.5 py-2.5 text-sm"
    >
      <span>
        📥 {count} SOS report{count > 1 ? "s" : ""} stored locally
      </span>
      <span className="font-data text-xs text-accent-cyan">View →</span>
    </Link>
  );
}
