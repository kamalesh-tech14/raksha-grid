const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Persisted once we have a definitive answer (profile found, submitted, or
// explicitly skipped) so the one-time form never shows again on this
// device/browser. Deliberately NOT set when the check itself fails (e.g.
// offline) — that's inconclusive, not "handled", so it's retried next visit.
const DONE_KEY = "raksha-grid:profile-onboarding-done";

export interface Profile {
  id: string;
  deviceId: string;
  name: string;
  mobileNumber?: string | null;
  email?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
}

export interface CreateProfileRequest {
  deviceIdHash: string;
  name: string;
  mobileNumber?: string;
  email?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  address?: string;
}

export function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DONE_KEY) === "1";
}

export function markOnboardingDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DONE_KEY, "1");
}

/**
 * Returns the existing profile, or null if this device has none yet.
 * Throws on network/server failure — callers should fail open (treat as
 * "couldn't check, don't block Home") rather than showing the form.
 */
export async function fetchProfile(deviceIdHash: string): Promise<Profile | null> {
  const res = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(deviceIdHash)}`);
  if (!res.ok) throw new Error(`Profile check failed (${res.status})`);
  // A device with no profile gets a genuinely empty body (Content-Length:
  // 0), not the text "null" — res.json() throws on that, so read as text
  // first and only parse when there's actually something to parse.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function submitProfile(payload: CreateProfileRequest): Promise<Profile> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Profile submit failed (${res.status})`);
  return res.json();
}
