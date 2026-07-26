export interface ReverseGeocodeResult {
  road?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

/**
 * Real reverse geocoding via OpenStreetMap's public Nominatim API. This is
 * a genuine external network call — Nominatim's own usage policy caps
 * unauthenticated use at ~1 request/second, which is exactly the shape of
 * "look up the address once after a GPS fix resolves," so no rate-limit
 * handling beyond a normal fetch error is needed for this project's scale.
 * If a production deployment needed higher volume, that's the point to
 * switch to a paid geocoding provider with an API key — not something to
 * fake in the meantime.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Reverse geocoding failed (${res.status})`);
  }

  const data = await res.json();
  const a = data.address ?? {};

  return {
    road: a.road ?? a.pedestrian ?? a.footway ?? a.neighbourhood,
    area: a.suburb ?? a.village ?? a.town,
    city: a.city ?? a.town ?? a.county,
    state: a.state,
    country: a.country,
    postcode: a.postcode,
  };
}
