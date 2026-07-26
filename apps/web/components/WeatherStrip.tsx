"use client";

import { useEffect, useState } from "react";
import { getBestLocation } from "@/lib/geolocation";
import { getWeather, type WeatherResult } from "@/lib/weather";

type State = "loading" | "loaded" | "error" | "no-location";

export default function WeatherStrip() {
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getBestLocation(6000)
      .then((pos) => getWeather(pos.coords.latitude, pos.coords.longitude))
      .then((w) => {
        setWeather(w);
        setState("loaded");
      })
      .catch((err) => {
        setState(err?.code !== undefined ? "no-location" : "error");
        setErrorMsg(err?.message ?? "Weather unavailable");
      });
  }, []);

  if (state === "loading") {
    return <div className="mb-4 h-[62px] animate-pulse rounded-card bg-bg-surface" />;
  }

  if (state === "no-location" || state === "error") {
    return (
      <div className="mb-4 rounded-card border border-border-hairline bg-bg-surface p-3 font-data text-xs text-text-muted">
        Weather unavailable — {errorMsg}
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-card border border-border-hairline bg-bg-surface px-4 py-3">
      <div>
        <p className="font-display text-xl font-bold">{Math.round(weather!.temperatureC)}°C</p>
        <p className="text-xs text-text-muted">{weather!.condition}</p>
      </div>
      <div className="text-right font-data text-xs text-text-muted leading-relaxed">
        Humidity {weather!.humidityPct}%
        <br />
        Wind {Math.round(weather!.windKmh)} km/h
      </div>
    </div>
  );
}
