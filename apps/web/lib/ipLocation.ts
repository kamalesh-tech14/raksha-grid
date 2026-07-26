export interface ApproxLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  /** ipapi.co reports an approximate accuracy radius isn't provided directly —
   *  we label this conservatively rather than inventing a number. */
  precision: "city";
}

/**
 * Real network/IP-based location via ipapi.co's free public API (no key
 * required, ~1000 req/day limit — fine for a fallback path, not for high
 * volume). This is NOT GPS and NOT WiFi-router positioning — it's "which
 * city does this IP address's network route through," which can be off
 * by tens or even hundreds of km depending on the ISP, exactly the
 * Mannarkudi/Mappedu gap seen earlier. It exists as an honest LAST RESORT
 * fallback when getPreciseLocation() fails entirely (permission denied,
 * no GPS hardware), never as a replacement for a real GPS fix, and the UI
 * must always label it "approximate" — never "your location".
 */
export async function getApproxIpLocation(): Promise<ApproxLocation> {
  const res = await fetch("https://ipapi.co/json/");
  if (!res.ok) throw new Error(`IP location lookup failed (${res.status})`);

  const data = await res.json();
  if (data.error) throw new Error(data.reason ?? "IP location unavailable");

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city,
    region: data.region,
    country: data.country_name,
    precision: "city",
  };
}
