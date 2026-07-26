export interface WeatherResult {
  temperatureC: number;
  condition: string;
  humidityPct: number;
  windKmh: number;
}

// WMO weather codes → short human labels (Open-Meteo returns the numeric
// code; this is the standard public WMO table, not a guess).
const WEATHER_CODE_LABEL: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

/**
 * Real live weather via Open-Meteo's free public API — no API key, no
 * account, genuinely current conditions for the given coordinates. This
 * replaces the "28°C Heavy Rain" text that was hard-coded directly in the
 * Home screen mockup and never connected to anything real.
 */
export async function getWeather(latitude: number, longitude: number): Promise<WeatherResult> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);

  const data = await res.json();
  const current = data.current;
  if (!current) throw new Error("Weather service returned no current conditions");

  return {
    temperatureC: current.temperature_2m,
    condition: WEATHER_CODE_LABEL[current.weather_code] ?? "Unknown",
    humidityPct: current.relative_humidity_2m,
    windKmh: current.wind_speed_10m,
  };
}
