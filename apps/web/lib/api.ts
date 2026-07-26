import type { CreateSosRequest, NetworkState, SosDeliveryState } from "@raksha-grid/shared-types";
import { reverseGeocode, type ReverseGeocodeResult } from "./reverseGeocode";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

interface CreateSosResponse {
  id: string;
  deliveryState: string;
  priority: string;
  createdAt: string;
}

export async function createSos(payload: CreateSosRequest): Promise<CreateSosResponse> {
  const res = await fetch(`${API_BASE_URL}/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new ApiError(`SOS create failed (${res.status})`, res.status);
  }
  return res.json();
}

export interface SosStatusResponse {
  id: string;
  priority: string;
  deliveryState: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  deliveryAttempts: Array<{
    route: string;
    simulated: boolean;
    attemptedAt: string;
    delivered: boolean;
    acknowledged: boolean;
  }>;
}

export async function getSosStatus(id: string): Promise<SosStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/sos/${id}/status`);
  if (!res.ok) {
    throw new ApiError(`SOS status fetch failed (${res.status})`, res.status);
  }
  return res.json();
}

/** Human labels for the delivery-state enum coming back from the backend (snake_case). */
export function formatDeliveryState(state: string): SosDeliveryState {
  return state.replace(/_/g, "-") as SosDeliveryState;
}

export interface PredictionResponse {
  id: string;
  disasterType: string;
  regionId: string;
  regionName: string;
  probability: number;
  confidence: number;
  severity: "low" | "moderate" | "high" | "severe" | "critical";
  expectedStart: string;
  expectedEnd?: string;
  affectedPopulationEstimate?: number;
  explanation: string[];
  recommendedActions: string[];
  dataSourceLabel: string;
  isDemonstrationData: boolean;
  generatedAt: string;
  validUntil: string;
  centerLat?: number;
  centerLng?: number;
  radiusMetres?: number;
}

export interface VerifiedAddress {
  primary: ReverseGeocodeResult;
  secondary: ReverseGeocodeResult | null;
  agree: boolean;
}

/**
 * Cross-checks the Nominatim result against a second, independent,
 * free geocoding service (BigDataCloud — no API key required, CORS-open).
 * If both services land on a different city, that's a genuine, useful
 * signal that the underlying coordinate itself is low-confidence (e.g.
 * an IP-based fallback fix) — not something either service got "wrong."
 * `agree` is a loose city-name comparison, not proof of correctness.
 */
export async function reverseGeocodeVerified(
  latitude: number,
  longitude: number
): Promise<VerifiedAddress> {
  const primary = await reverseGeocode(latitude, longitude);

  let secondary: ReverseGeocodeResult | null = null;
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      secondary = {
        road: data.localityInfo?.administrative?.find((a: any) => a.adminLevel === 10)?.name,
        area: data.locality,
        city: data.city || data.locality,
        state: data.principalSubdivision,
        country: data.countryName,
        postcode: data.postcode,
      };
    }
  } catch {
    // Secondary check is a nice-to-have, not a requirement — if it fails,
    // the primary Nominatim result is still shown on its own.
  }

  const norm = (s?: string) => (s ?? "").toLowerCase().trim();
  const agree =
    !secondary ||
    norm(primary.city) === norm(secondary.city) ||
    (norm(primary.city).length > 0 && norm(secondary.city).includes(norm(primary.city))) ||
    (norm(secondary.city).length > 0 && norm(primary.city).includes(norm(secondary.city)));

  return { primary, secondary, agree };
}

export interface PlaceSearchResult {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Forward geocoding (place name → coordinates) via the same Nominatim
 * service, used for manual location correction: when auto-detected
 * location is wrong (see the Mannarkudi/Mappedu case), letting the person
 * search for and select their real place is the honest fix — every real
 * consumer app (ride-hailing, delivery) falls back to exactly this.
 */
export async function searchPlace(query: string): Promise<PlaceSearchResult[]> {
  if (query.trim().length < 3) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);

  const data = await res.json();
  return data.map((d: any) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}
export async function getPredictions(regionId?: string): Promise<PredictionResponse[]> {
  const url = new URL(`${API_BASE_URL}/predictions`);
  if (regionId) url.searchParams.set("regionId", regionId);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new ApiError(`Predictions fetch failed (${res.status})`, res.status);
  }
  return res.json();
}

export interface ShelterResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  isOpen: boolean;
  hasMedical: boolean;
  hasPower: boolean;
}

export interface HospitalResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  emergencyBeds: number;
  icuBeds: number;
  ambulanceAvailable: boolean;
  isOperational: boolean;
}

export async function getShelters(): Promise<ShelterResponse[]> {
  const res = await fetch(`${API_BASE_URL}/shelters`);
  if (!res.ok) throw new ApiError(`Shelters fetch failed (${res.status})`, res.status);
  return res.json();
}

export async function getHospitals(): Promise<HospitalResponse[]> {
  const res = await fetch(`${API_BASE_URL}/hospitals`);
  if (!res.ok) throw new ApiError(`Hospitals fetch failed (${res.status})`, res.status);
  return res.json();
}

export function readNetworkState(): NetworkState {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  // navigator.connection is non-standard but widely available on Android
  // Chrome, which is exactly the low-end-device case this project targets.
  const conn = (navigator as any)?.connection;

  return {
    online,
    connectionType: online ? (conn?.type === "cellular" ? "cellular" : "wifi") : "none",
    effectiveType: conn?.effectiveType,
    // Bluetooth relay / LoRa / satellite availability isn't real browser
    // detection — Phase 9 wires these to the Communication Simulator.
    // Reporting them as unavailable here is the honest default, not a
    // simplification we're hiding.
    relayAvailable: false,
    loraGatewayAvailable: false,
    satelliteGatewayAvailable: false,
    simulated: false,
  };
}
