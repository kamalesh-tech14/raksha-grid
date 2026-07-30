const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  email: string;
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const { accessToken, refreshToken } = await res.json();
  return { accessToken, refreshToken, email };
}

export function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem("admin-session", JSON.stringify(session));
}

export function loadAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("admin-session");
  return stored ? JSON.parse(stored) : null;
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("admin-session");
}

export async function fetchSosQueue(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/sos`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch SOS queue: ${res.status}`);
  }

  return res.json();
}
