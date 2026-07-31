"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getPredictions,
  ApiError,
  type PredictionResponse,
  reverseGeocodeVerified,
  searchPlace,
  type VerifiedAddress,
  type PlaceSearchResult,
  getShelters,
  getHospitals,
  type ShelterResponse,
  type HospitalResponse,
} from "@/lib/api";
import { getBestLocation } from "@/lib/geolocation";
import { getApproxIpLocation } from "@/lib/ipLocation";

// Real shelter/hospital data now comes from GET /shelters and GET /hospitals
// (see lib/api.ts getShelters/getHospitals) — the DEMO_SHELTERS/
// DEMO_HOSPITALS constants that used to live here are gone.

const severityColor: Record<string, string> = {
  low: "#2ED9A0",
  moderate: "#3AD1F2",
  high: "#F2A93C",
  severe: "#FF4D5E",
  critical: "#FF4D5E",
};

function divIcon(emoji: string, ring?: string) {
  return L.divIcon({
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:#111A2B;border:2px solid ${ring ?? "rgba(255,255,255,0.2)"};
      display:flex;align-items:center;justify-content:center;font-size:15px;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
    ">${emoji}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** Recenters the map whenever the target position changes, at the given zoom. */
function RecenterOnLocation({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

/** Lets the person tap the map to manually correct their location — the
 * honest fallback when auto-detection is wrong (see the "Mannarkudi vs
 * Mappedu" case: browser geolocation without a real GPS fix can be off
 * by hundreds of kilometres). */
function TapToSetLocation({ onSet }: { onSet: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSet(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Lets the person tap the map to set a destination for the safest route feature */
function TapToSetSafestDestination({ onSet }: { onSet: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSet(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface RouteResult {
  distanceMetres: number;
  durationSeconds: number;
  coordinates: [number, number][]; // [lat, lng] pairs for Polyline
  dangerExposureMetres?: number; // Total distance through danger zones
  isSafeRoute?: boolean; // Whether this route avoids all dangers
}

interface RiskZone {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusMetres: number;
  disasterType: string;
  severity: string;
}

/**
 * Haversine formula — calculate distance between two lat/lng points in metres
 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a single point is inside a danger zone
 */
function isPointInDangerZone(lat: number, lng: number, zone: RiskZone): boolean {
  const distance = haversine(lat, lng, zone.centerLat, zone.centerLng);
  return distance <= zone.radiusMetres;
}

/**
 * Calculate total danger exposure for a route — metres of polyline inside danger zones
 */
function calculateDangerExposure(coordinates: [number, number][], zones: RiskZone[]): { total: number; zones: Set<string> } {
  let totalMetres = 0;
  const affectedZones = new Set<string>();

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lat1, lng1] = coordinates[i];
    const [lat2, lng2] = coordinates[i + 1];
    const segmentDistance = haversine(lat1, lng1, lat2, lng2);

    // Check midpoint of segment against each zone
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    for (const zone of zones) {
      if (isPointInDangerZone(midLat, midLng, zone)) {
        totalMetres += segmentDistance;
        affectedZones.add(zone.id);
        break; // Don't double-count if multiple zones overlap
      }
    }
  }

  return { total: totalMetres, zones: affectedZones };
}

/**
 * Fetch multiple route alternatives from OSRM with danger avoidance scoring
 */
async function fetchSafestRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  dangerZones: RiskZone[]
): Promise<RouteResult> {
  // Get up to 3 alternative routes
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?alternatives=true&overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);

  const data = await res.json();
  if (!data.routes?.length) throw new Error("No route found");

  // Score each route by danger exposure
  const scoredRoutes = data.routes.map((route: any) => {
    const coordinates = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    const { total: dangerMetres, zones: affectedZones } = calculateDangerExposure(coordinates, dangerZones);

    return {
      distanceMetres: route.distance,
      durationSeconds: route.duration,
      coordinates,
      dangerExposureMetres: dangerMetres,
      isSafeRoute: dangerMetres === 0,
      affectedZones: Array.from(affectedZones),
    };
  });

  // Sort: first by safety (fully safe routes first), then by danger exposure, then by distance
  scoredRoutes.sort((a: any, b: any) => {
    if (a.isSafeRoute !== b.isSafeRoute) return (b.isSafeRoute ? 1 : 0) - (a.isSafeRoute ? 1 : 0);
    if (a.dangerExposureMetres !== b.dangerExposureMetres) return a.dangerExposureMetres - b.dangerExposureMetres;
    return a.distanceMetres - b.distanceMetres;
  });

  return scoredRoutes[0];
}

/**
 * Real routing via OSRM (Open Source Routing Machine) — router.project-osrm.org
 * is OSRM's free public demo server. Returns an actual road-following
 * route with real distance and duration — the honest version of "point
 * someone toward the nearest shelter," not live turn-by-turn navigation.
 */
async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);

  const data = await res.json();
  if (!data.routes?.[0]) throw new Error("No route found");

  const route = data.routes[0];
  return {
    distanceMetres: route.distance,
    durationSeconds: route.duration,
    coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
  };
}

type LocationSource = "gps" | "manual" | "approximate-ip";

export default function RiskMap() {
  const [predictions, setPredictions] = useState<PredictionResponse[]>([]);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; source: LocationSource } | null>(null);
  const [address, setAddress] = useState<VerifiedAddress | null>(null);
  const [addressState, setAddressState] = useState<"idle" | "loading" | "error">("idle");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "found" | "error">("idle");
  const [locError, setLocError] = useState<string | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeState, setRouteState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeTarget, setRouteTarget] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tapToSetActive, setTapToSetActive] = useState(false);
  const [shelters, setShelters] = useState<ShelterResponse[]>([]);
  const [hospitals, setHospitals] = useState<HospitalResponse[]>([]);

  // Safest route feature state
  const [safestRouteMode, setSafestRouteMode] = useState(false);
  const [selectingSafestDestination, setSelectingSafestDestination] = useState(false);
  const [safestRoute, setSafestRoute] = useState<RouteResult | null>(null);
  const [safestRouteState, setSafestRouteState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [safestRouteError, setSafestRouteError] = useState<string | null>(null);
  const [safestRouteTarget, setSafestRouteTarget] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [safestRouteFeedback, setSafestRouteFeedback] = useState<string | null>(null);

  const DEFAULT_CENTER: [number, number] = [13.0524, 80.096]; // Chennai · Poonamallee — matches the seeded demo region

  function resolveAddressFor(lat: number, lng: number) {
    setAddressState("loading");
    reverseGeocodeVerified(lat, lng)
      .then((result) => {
        setAddress(result);
        setAddressState("idle");
      })
      .catch((err) => {
        setAddressState("error");
        setAddressError(err instanceof Error ? err.message : "Reverse geocoding failed");
      });
  }

  function locate() {
    setLocStatus("requesting");
    setLocError(null);

    // getBestLocation watches for several seconds and keeps the most
    // accurate reading, instead of trusting whatever the first (often
    // network-estimated) fix says.
    getBestLocation(8000)
      .then((pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy, source: "gps" });
        setLocStatus("found");
        resolveAddressFor(latitude, longitude);
      })
      .catch((err) => {
        // Real GPS failed entirely (denied, no hardware, etc.) — rather
        // than leaving the map stuck on the default Chennai centre, make
        // ONE last-resort attempt at a city-level IP-based guess. This is
        // explicitly NOT presented as your location — see the amber
        // "approximate" labelling below — it exists only so the map has
        // somewhere sensible to point at before you search or tap to
        // correct it. It is not tried before GPS, only after GPS fails.
        setLocError(err?.message ?? "Location request failed");
        getApproxIpLocation()
          .then((ip) => {
            setUserLocation({ lat: ip.latitude, lng: ip.longitude, source: "approximate-ip" });
            setLocStatus("found");
            resolveAddressFor(ip.latitude, ip.longitude);
          })
          .catch(() => {
            setLocStatus("error");
          });
      });
  }

  function setManualLocation(lat: number, lng: number) {
    setUserLocation({ lat, lng, source: "manual" });
    setLocStatus("found");
    setTapToSetActive(false);
    resolveAddressFor(lat, lng);
  }

  function runSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchPlace(q)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }

  function routeTo(name: string, lat: number, lng: number) {
    if (!userLocation) return;
    setRouteTarget({ name, lat, lng });
    setRouteState("loading");
    setRouteError(null);

    fetchRoute(userLocation.lat, userLocation.lng, lat, lng)
      .then((r) => {
        setRoute(r);
        setRouteState("loaded");
      })
      .catch((err) => {
        setRouteState("error");
        setRouteError(err instanceof Error ? err.message : "Routing failed");
      });
  }

  function computeSafestRoute(name: string, lat: number, lng: number) {
    if (!userLocation) return;

    setSafestRouteTarget({ name, lat, lng });
    setSafestRouteState("loading");
    setSafestRouteError(null);
    setSafestRouteFeedback(null);
    setSelectingSafestDestination(false);

    // Convert predictions to risk zones
    const dangerZones: RiskZone[] = predictions
      .filter((p) => p.centerLat != null && p.centerLng != null && p.radiusMetres)
      .map((p) => ({
        id: p.id,
        centerLat: p.centerLat as number,
        centerLng: p.centerLng as number,
        radiusMetres: p.radiusMetres as number,
        disasterType: p.disasterType,
        severity: p.severity,
      }));

    fetchSafestRoute(userLocation.lat, userLocation.lng, lat, lng, dangerZones)
      .then((r: any) => {
        setSafestRoute(r);
        setSafestRouteState("loaded");

        // Generate feedback message
        if (r.isSafeRoute) {
          setSafestRouteFeedback(
            `✅ Safest route selected — avoids all ${dangerZones.length} active danger zones`
          );
        } else {
          const affectedZoneNames = r.affectedZones
            ?.map((zoneId: string) => {
              const zone = dangerZones.find((z) => z.id === zoneId);
              return zone?.disasterType ?? "danger";
            })
            .join(", ") || "danger";

          setSafestRouteFeedback(
            `⚠️ No fully safe route available. This route has the least exposure — passes near ${affectedZoneNames} for approximately ${Math.round(r.dangerExposureMetres / 1000)}m.`
          );
        }
      })
      .catch((err) => {
        setSafestRouteState("error");
        setSafestRouteError(err instanceof Error ? err.message : "Routing failed");
      });
  }

  useEffect(() => {
    getPredictions("chennai-poonamallee")
      .then(setPredictions)
      .catch((err) =>
        setPredictionError(err instanceof ApiError ? `Server error (${err.status})` : "Couldn't reach the server")
      );

    getShelters().then(setShelters).catch(() => setShelters([]));
    getHospitals().then(setHospitals).catch(() => setHospitals([]));

    locate(); // try once automatically; manual search/tap below covers a bad fix
  }, []);

  const riskZones = predictions.filter((p) => p.centerLat != null && p.centerLng != null && p.radiusMetres);

  return (
    <div className="w-full">
      {/* Manual location search — the real fix for a bad auto-detected
          fix: type your actual place name and jump straight there. */}
      <div className="relative border-b border-border-hairline bg-bg-surface px-4 py-3">
        <label className="text-[11px] uppercase tracking-wide text-text-muted">
          Not where you actually are? Search your real location
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="e.g. Mannarkudi, Tamil Nadu"
          className="mt-1.5 w-full rounded-card border border-border-hairline bg-bg-void px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-cyan"
        />
        {searchLoading && <p className="mt-1 font-data text-xs text-text-muted">Searching…</p>}
        {searchResults.length > 0 && (
          <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-card border border-border-hairline bg-bg-surface-raised">
            {searchResults.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setManualLocation(r.lat, r.lng);
                    setSearchResults([]);
                    setSearchQuery(r.label);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-bg-void"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setTapToSetActive((v) => !v)}
          className={`mt-2 w-full rounded-card border py-2 text-xs font-semibold ${
            tapToSetActive
              ? "border-warn-amber/50 bg-warn-amber/15 text-warn-amber"
              : "border-border-hairline text-text-muted"
          }`}
        >
          {tapToSetActive ? "📍 Tap anywhere on the map to set your location…" : "Or tap the map to drop a pin manually"}
        </button>
      </div>

      <div className="relative" style={{ height: "360px" }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", background: "#0A0F1C" }}
        >
          <TileLayer
            attribution={
              satellite
                ? "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
                : "&copy; OpenStreetMap contributors"
            }
            url={
              satellite
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
          />

          {tapToSetActive && <TapToSetLocation onSet={setManualLocation} />}

          {selectingSafestDestination && (
            <TapToSetSafestDestination
              onSet={(lat, lng) => computeSafestRoute("Selected destination", lat, lng)}
            />
          )}

          {route && (
            <Polyline positions={route.coordinates} pathOptions={{ color: "#3AD1F2", weight: 4, opacity: 0.85 }} />
          )}

          {safestRoute && (
            <Polyline
              positions={safestRoute.coordinates}
              pathOptions={{ color: "#2ED9A0", weight: 5, opacity: 0.9, dashArray: "8 6" }}
            />
          )}

          {userLocation && (
            <>
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={divIcon(
                  userLocation.source === "approximate-ip" ? "❓" : "📍",
                  userLocation.source === "approximate-ip" ? "#F2A93C" : "#3AD1F2"
                )}
              >
                <Popup>
                  {userLocation.source === "manual" && "Manually set location"}
                  {userLocation.source === "gps" &&
                    `Your live location${userLocation.accuracy ? ` (±${Math.round(userLocation.accuracy)}m)` : ""}`}
                  {userLocation.source === "approximate-ip" &&
                    "⚠ Rough network-based guess — NOT your real location. Search or tap to correct."}
                </Popup>
              </Marker>
              {userLocation.accuracy && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={userLocation.accuracy}
                  pathOptions={{ color: "#3AD1F2", fillColor: "#3AD1F2", fillOpacity: 0.08, weight: 1 }}
                />
              )}
              {userLocation.source === "approximate-ip" && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={30000}
                  pathOptions={{ color: "#F2A93C", fillColor: "#F2A93C", fillOpacity: 0.05, weight: 1, dashArray: "6 6" }}
                />
              )}
              <RecenterOnLocation
                lat={userLocation.lat}
                lng={userLocation.lng}
                zoom={userLocation.source === "approximate-ip" ? 10 : userLocation.accuracy && userLocation.accuracy < 50 ? 18 : 16}
              />
            </>
          )}

          {riskZones.map((p) => (
            <Circle
              key={p.id}
              center={[p.centerLat as number, p.centerLng as number]}
              radius={p.radiusMetres as number}
              pathOptions={{
                color: severityColor[p.severity] ?? "#F2A93C",
                fillColor: severityColor[p.severity] ?? "#F2A93C",
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            >
              <Popup>
                <b>{p.disasterType}</b> — {Math.round(p.probability * 100)}% probability, {p.severity} severity
                <br />
                <span style={{ fontSize: 11, opacity: 0.7 }}>Demonstration data · {p.dataSourceLabel}</span>
              </Popup>
            </Circle>
          ))}

          {shelters.map((s) => (
            <Marker key={s.id} position={[s.latitude, s.longitude]} icon={divIcon("🏠", "#2ED9A0")}>
              <Popup>
                <div>
                  {s.name}
                  <br />
                  Capacity {s.occupancy} / {s.capacity} · {s.isOpen ? "Open" : "Closed"}
                  <br />
                  <button
                    onClick={() => routeTo(s.name, s.latitude, s.longitude)}
                    disabled={!userLocation}
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#3AD1F2",
                      background: "none",
                      border: "none",
                      textDecoration: "underline",
                      cursor: userLocation ? "pointer" : "not-allowed",
                      padding: 0,
                    }}
                  >
                    {userLocation ? "Route here" : "Find your location first"}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {hospitals.map((h) => (
            <Marker key={h.id} position={[h.latitude, h.longitude]} icon={divIcon("🏥", "#4C7CFF")}>
              <Popup>
                <div>
                  {h.name}
                  <br />
                  {h.emergencyBeds} emergency beds · {h.isOperational ? "Available" : "Closed"}
                  <br />
                  <button
                    onClick={() => routeTo(h.name, h.latitude, h.longitude)}
                    disabled={!userLocation}
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#3AD1F2",
                      background: "none",
                      border: "none",
                      textDecoration: "underline",
                      cursor: userLocation ? "pointer" : "not-allowed",
                      padding: 0,
                    }}
                  >
                    {userLocation ? "Route here" : "Find your location first"}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <button
          type="button"
          onClick={() => setSatellite((s) => !s)}
          className="absolute right-3 top-3 z-[1000] rounded-card border border-border-hairline bg-bg-surface-raised/95 px-3 py-1.5 font-data text-[11px] text-text-primary shadow-card"
        >
          {satellite ? "🗺️ Street view" : "🛰️ Satellite view"}
        </button>

        {predictionError && (
          <div className="absolute left-3 right-3 top-3 z-[1000] rounded-card border border-warn-amber/40 bg-bg-surface-raised/95 px-3 py-2 font-data text-xs text-warn-amber">
            Risk zones unavailable: {predictionError}
          </div>
        )}
      </div>

      <div className="border-t border-border-hairline bg-bg-surface px-4 py-3">
        <div
          className={`rounded-card border px-3 py-2 font-data text-xs ${
            locStatus === "found"
              ? "border-success-green/40 bg-success-green/10 text-success-green"
              : locStatus === "error"
              ? "border-warn-amber/40 bg-warn-amber/10 text-warn-amber"
              : "border-border-hairline text-text-muted"
          }`}
        >
          {locStatus === "idle" && "📍 Location not requested yet"}
          {locStatus === "requesting" && "📍 Getting your best GPS fix… (watching for up to 8s for accuracy to improve)"}
          {locStatus === "found" &&
            userLocation?.source === "manual" &&
            "✅ Location manually set"}
          {locStatus === "found" &&
            userLocation?.source === "gps" &&
            `✅ GPS fix — accuracy ±${userLocation?.accuracy ? Math.round(userLocation.accuracy) : "?"}m`}
          {locStatus === "found" && userLocation?.source === "approximate-ip" && (
            <>⚠ GPS failed ({locError}) — showing a rough network-based guess only (city-level, could be
            hundreds of km off). Search or tap the map below to set your real location.</>
          )}
          {locStatus === "error" && `⚠ ${locError}`}
        </div>
        <button
          type="button"
          onClick={locate}
          className="mt-2 w-full rounded-card border border-accent-cyan/40 bg-accent-cyan/10 py-2.5 text-sm font-semibold text-accent-cyan"
        >
          📍 Find my GPS location
        </button>

        {routeTarget && (
          <div className="mt-3 rounded-card border border-accent-electric/35 bg-accent-electric/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Route to {routeTarget.name}</p>
              <button
                type="button"
                onClick={() => {
                  setRoute(null);
                  setRouteTarget(null);
                  setRouteState("idle");
                }}
                className="font-data text-[11px] text-text-muted underline"
              >
                Clear
              </button>
            </div>
            {routeState === "loading" && (
              <p className="mt-1 font-data text-xs text-text-muted">Calculating real driving route…</p>
            )}
            {routeState === "error" && (
              <p className="mt-1 font-data text-xs text-warn-amber">Route unavailable — {routeError}</p>
            )}
            {routeState === "loaded" && route && (
              <p className="mt-1 font-data text-xs text-text-primary">
                {(route.distanceMetres / 1000).toFixed(1)} km · ~{Math.round(route.durationSeconds / 60)} min by road
              </p>
            )}
          </div>
        )}

        {!safestRouteMode && (
          <button
            type="button"
            onClick={() => setSafestRouteMode(true)}
            className="mt-3 w-full rounded-card border border-success-green/40 bg-success-green/10 py-2.5 text-sm font-semibold text-success-green"
          >
            🛡️ Find safest route
          </button>
        )}

        {safestRouteMode && (
          <div className="mt-3 rounded-card border border-success-green/40 bg-success-green/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-success-green">🛡️ Find Safest Route</p>
              <button
                type="button"
                onClick={() => {
                  setSafestRouteMode(false);
                  setSelectingSafestDestination(false);
                  setSafestRoute(null);
                  setSafestRouteTarget(null);
                  setSafestRouteFeedback(null);
                  setSafestRouteState("idle");
                }}
                className="font-data text-[11px] text-text-muted underline"
              >
                Cancel
              </button>
            </div>

            {!selectingSafestDestination && !safestRouteTarget && (
              <div>
                <p className="font-data text-xs text-text-secondary mb-2">Choose a destination:</p>
                <button
                  type="button"
                  onClick={() => setSelectingSafestDestination(true)}
                  className="w-full rounded-card border border-success-green/40 bg-success-green/5 py-1.5 text-xs font-semibold text-success-green mb-2"
                >
                  📍 Tap on the map to set destination
                </button>

                {shelters.length > 0 && (
                  <div className="mt-2">
                    <p className="font-data text-[10px] text-text-muted mb-1">Or pick a shelter:</p>
                    {shelters.slice(0, 2).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => computeSafestRoute(s.name, s.latitude, s.longitude)}
                        className="w-full text-left px-2 py-1 text-xs text-text-primary hover:bg-success-green/10 rounded border border-transparent"
                      >
                        🏠 {s.name}
                      </button>
                    ))}
                  </div>
                )}

                {hospitals.length > 0 && (
                  <div className="mt-2">
                    <p className="font-data text-[10px] text-text-muted mb-1">Or pick a hospital:</p>
                    {hospitals.slice(0, 2).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => computeSafestRoute(h.name, h.latitude, h.longitude)}
                        className="w-full text-left px-2 py-1 text-xs text-text-primary hover:bg-success-green/10 rounded border border-transparent"
                      >
                        🏥 {h.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectingSafestDestination && (
              <p className="font-data text-xs text-success-green">📍 Tap your destination on the map…</p>
            )}

            {safestRouteTarget && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-success-green">To: {safestRouteTarget.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSafestRouteTarget(null);
                      setSafestRoute(null);
                      setSafestRouteFeedback(null);
                      setSafestRouteState("idle");
                    }}
                    className="font-data text-[10px] text-text-muted underline"
                  >
                    Clear
                  </button>
                </div>

                {safestRouteState === "loading" && (
                  <p className="mt-1 font-data text-xs text-text-muted">Analyzing routes for danger exposure…</p>
                )}

                {safestRouteState === "error" && (
                  <p className="mt-1 font-data text-xs text-warn-amber">Routing failed — {safestRouteError}</p>
                )}

                {safestRouteState === "loaded" && safestRoute && (
                  <div>
                    <p className="mt-2 font-data text-xs text-success-green font-semibold">{safestRouteFeedback}</p>
                    <p className="mt-2 font-data text-xs text-text-primary">
                      {(safestRoute.distanceMetres / 1000).toFixed(1)} km · ~{Math.round(safestRoute.durationSeconds / 60)} min by road
                      {safestRoute.dangerExposureMetres ? ` · ${Math.round(safestRoute.dangerExposureMetres)}m through danger zones` : ""}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {userLocation && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">Your exact location</p>
              {address && !address.agree && (
                <span className="rounded-md border border-warn-amber/40 px-1.5 py-0.5 font-data text-[10px] text-warn-amber">
                  ⚠ sources disagree
                </span>
              )}
            </div>

            {addressState === "loading" && (
              <p className="mt-1.5 font-data text-xs text-text-muted">Cross-checking address against two geocoders…</p>
            )}

            {addressState === "error" && (
              <p className="mt-1.5 font-data text-xs text-warn-amber">Street name unavailable — {addressError}</p>
            )}

            {addressState === "idle" && address && (
              <>
                <p className="font-display text-base font-bold text-text-primary">
                  {address.primary.road ?? "(unnamed road)"}
                </p>
                <p className="mt-0.5 text-sm text-text-primary">{address.primary.area ?? "—"}</p>
                <p className="mt-0.5 font-data text-xs text-text-muted">
                  {[address.primary.city, address.primary.state].filter(Boolean).join(", ")}
                  {address.primary.country ? ` · ${address.primary.country}` : ""}
                </p>
                {address.secondary && (
                  <p className="mt-1.5 font-data text-[11px] text-text-muted">
                    Second source says: {[address.secondary.city, address.secondary.state].filter(Boolean).join(", ") || "—"}
                  </p>
                )}
              </>
            )}

            <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-border-hairline pt-2.5 font-data text-[11px] text-text-muted">
              <span>
                Lat: <span className="text-text-primary">{userLocation.lat.toFixed(6)}</span>
              </span>
              <span>
                Lng: <span className="text-text-primary">{userLocation.lng.toFixed(6)}</span>
              </span>
              <span>
                Accuracy:{" "}
                <span className="text-text-primary">
                  {userLocation.accuracy
                    ? `±${Math.round(userLocation.accuracy)}m`
                    : userLocation.source === "approximate-ip"
                    ? "~city-level (unreliable)"
                    : "manual"}
                </span>
              </span>
              <span>
                Postcode: <span className="text-text-primary">{address?.primary.postcode ?? "—"}</span>
              </span>
            </div>
            <p className="mt-2 font-data text-[10px] text-text-disabled">
              Cross-verified via OpenStreetMap Nominatim + BigDataCloud
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
