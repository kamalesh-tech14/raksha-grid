"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAdminSession, clearAdminSession, fetchSosQueue } from "@/lib/admin-auth";

interface SosIncident {
  id: string;
  priority: string;
  deliveryState: string;
  emergencyType: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

export default function ControlDashboard() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<SosIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const session = loadAdminSession();

  useEffect(() => {
    if (!session) {
      router.push("/control/login");
      return;
    }

    const loadQueue = async () => {
      try {
        const data = await fetchSosQueue(session.accessToken);
        setIncidents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load SOS queue");
      } finally {
        setLoading(false);
      }
    };

    loadQueue();
  }, [session, router]);

  const handleLogout = () => {
    clearAdminSession();
    router.push("/control/login");
  };

  if (!session) return null;

  return (
    <div className="mx-auto min-h-dvh max-w-[1200px] bg-bg-void">
      {/* Header */}
      <header className="border-b border-border-hairline bg-bg-secondary px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">SOS Control Queue</h1>
            <p className="mt-1 font-data text-xs text-text-muted">
              Logged in as <span className="text-accent-cyan">{session.email}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded bg-danger-red/20 px-3 py-2 font-data text-sm text-danger-red transition-opacity hover:opacity-80"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {loading ? (
          <div className="text-center font-data text-text-muted">Loading SOS queue…</div>
        ) : error ? (
          <div className="rounded border border-danger-red/50 bg-danger-red/10 px-4 py-3 font-data text-sm text-danger-red">
            {error}
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded border border-border-hairline bg-bg-secondary px-4 py-6 text-center font-data text-text-muted">
            No active SOS incidents
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-data text-xs text-text-muted">
              {incidents.length} active incident{incidents.length !== 1 ? "s" : ""}
            </p>
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded border border-border-hairline bg-bg-secondary p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-data text-xs font-semibold text-text-muted">ID</p>
                    <p className="font-mono text-sm text-text-primary">{incident.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-xs font-semibold text-text-muted">PRIORITY</p>
                    <p className="font-data text-sm font-bold text-warn-amber">{incident.priority}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-data text-xs font-semibold text-text-muted">Type</p>
                    <p className="font-data text-sm text-text-primary">{incident.emergencyType}</p>
                  </div>
                  <div>
                    <p className="font-data text-xs font-semibold text-text-muted">Status</p>
                    <p className="font-data text-sm text-accent-cyan">{incident.deliveryState}</p>
                  </div>
                  {incident.latitude != null && incident.longitude != null && (
                    <>
                      <div>
                        <p className="font-data text-xs font-semibold text-text-muted">Latitude</p>
                        <p className="font-mono text-sm text-text-primary">{incident.latitude.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="font-data text-xs font-semibold text-text-muted">Longitude</p>
                        <p className="font-mono text-sm text-text-primary">{incident.longitude.toFixed(4)}</p>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <p className="font-data text-xs font-semibold text-text-muted">Reported At</p>
                    <p className="font-data text-sm text-text-primary">
                      {new Date(incident.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
