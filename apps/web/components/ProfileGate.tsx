"use client";

import { useEffect, useState } from "react";
import { getOrCreateDeviceIdHash } from "@/lib/device";
import { fetchProfile, isOnboardingDone, markOnboardingDone } from "@/lib/profile";
import ProfileForm from "./ProfileForm";

type GateState = "checking" | "form" | "home";

/**
 * Device-recognition gate: no login, ever — just the deviceIdHash already
 * used for SOS. Shows the one-time profile form only if this device has
 * never resolved onboarding before. Fails open on any check error (offline,
 * server down, etc.) straight to Home WITHOUT marking onboarding done, so
 * it's retried next visit instead of either nagging forever or blocking
 * Home/SOS on a network call.
 */
export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>(isOnboardingDone() ? "home" : "checking");

  useEffect(() => {
    if (isOnboardingDone()) return;

    let cancelled = false;
    fetchProfile(getOrCreateDeviceIdHash())
      .then((profile) => {
        if (cancelled) return;
        if (profile) markOnboardingDone();
        setState(profile ? "home" : "form");
      })
      .catch(() => {
        if (!cancelled) setState("home");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "form") {
    return <ProfileForm onDone={() => setState("home")} />;
  }

  // "checking" renders Home's own shell underneath rather than a spinner —
  // the check is typically sub-second and Home has nothing that depends on
  // it, so there's no meaningful loading state worth showing.
  return <>{children}</>;
}
