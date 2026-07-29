import { createSos, ApiError } from "./api";
import { getAllQueued, updateQueued, removeQueued, type QueuedSos } from "./offlineQueue";

const BASE_DELAY_MS = 3000;
const MAX_DELAY_MS = 60_000;
const MAX_RETRIES = 8;

type Listener = (queue: QueuedSos[]) => void;
const listeners = new Set<Listener>();

function notify(queue: QueuedSos[]) {
  listeners.forEach((l) => l(queue));
}

function backoffDelay(retryCount: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** retryCount, MAX_DELAY_MS);
}

/**
 * Attempts every due entry once. Safe to call repeatedly — entries not yet
 * due (nextRetryAt in the future) are skipped, and a success removes the
 * entry using the SAME idempotencyKey it was created with, so a request
 * that actually landed on a previous flaky attempt never becomes a
 * duplicate incident (server-side idempotency from Phase 3 backs this up).
 */
export async function runSyncPass(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const queue = await getAllQueued();
  const due = queue.filter((e) => e.status !== "syncing" && e.nextRetryAt <= Date.now());

  for (const entry of due) {
    entry.status = "syncing";
    await updateQueued(entry);
    notify(await getAllQueued());

    try {
      await createSos(entry.payload);
      await removeQueued(entry.id);
    } catch (err) {
      const retryCount = entry.retryCount + 1;
      const failed = retryCount >= MAX_RETRIES;
      const updated: QueuedSos = {
        ...entry,
        status: failed ? "failed" : "pending",
        retryCount,
        nextRetryAt: Date.now() + backoffDelay(retryCount),
        lastError:
          err instanceof ApiError ? `Server error ${err.status ?? ""}`.trim() : "Network unreachable",
      };
      await updateQueued(updated);
    }
    notify(await getAllQueued());
  }
}

let started = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the background sync loop for the current tab session. This is a
 * foreground poll (every 5s) PLUS a real `online` event listener — not
 * relying on the Background Sync API, because that has inconsistent
 * browser support (notably absent on iOS Safari), and this project's own
 * rule is "never suggest browser background execution is guaranteed on
 * every platform." If the tab is closed, syncing pauses and resumes next
 * time the app is opened — queued entries are still safe in IndexedDB.
 */
/**
 * An entry can be orphaned mid-request in "syncing" status if the tab
 * closes, navigates away, or crashes before the request settles — and
 * runSyncPass's own due-filter permanently excludes "syncing" entries, so
 * without this an orphaned entry would never retry again. Nothing from a
 * previous JS context can still be in flight once we're starting up fresh,
 * so it's always safe to reset "syncing" back to "pending" here.
 */
async function resetOrphanedSyncingEntries() {
  const queue = await getAllQueued();
  for (const entry of queue) {
    if (entry.status === "syncing") {
      await updateQueued({ ...entry, status: "pending", nextRetryAt: Date.now() });
    }
  }
}

export function startSyncEngine() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("online", () => void runSyncPass());
  intervalId = setInterval(() => void runSyncPass(), 5000);
  void resetOrphanedSyncingEntries().then(() => runSyncPass());
}

export function stopSyncEngine() {
  if (intervalId) clearInterval(intervalId);
  started = false;
}

export function onQueueChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function retryNow(id: string) {
  const queue = await getAllQueued();
  const entry = queue.find((e) => e.id === id);
  if (!entry) return;
  await updateQueued({ ...entry, nextRetryAt: Date.now() });
  await runSyncPass();
}
