"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, saveAdminSession } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await loginAdmin(email, password);
      saveAdminSession(session);
      router.push("/control");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col items-center justify-center bg-bg-void px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Raksha Grid Control</h1>
          <p className="mt-2 font-data text-sm text-text-muted">Administrator Dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-data text-xs font-medium text-text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@raksha-grid.local"
              className="mt-1 w-full rounded border border-border-hairline bg-bg-secondary px-3 py-2 font-data text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block font-data text-xs font-medium text-text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded border border-border-hairline bg-bg-secondary px-3 py-2 font-data text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded border border-danger-red/50 bg-danger-red/10 px-3 py-2 font-data text-xs text-danger-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-accent-cyan px-4 py-2 font-data text-sm font-semibold text-bg-void transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center font-data text-xs text-text-muted">
          Demo credentials:
          <br />
          admin@raksha-grid.local
          <br />
          admin@RakshaGrid2026!
        </p>
      </div>
    </div>
  );
}
