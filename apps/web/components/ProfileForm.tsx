"use client";

import { useState } from "react";
import { getOrCreateDeviceIdHash } from "@/lib/device";
import { submitProfile, markOnboardingDone } from "@/lib/profile";

interface ProfileFormProps {
  onDone: () => void;
}

/**
 * One-time, optional profile form — shown once per device (see
 * ProfileGate). Skippable at any point: skipping (or submit failing)
 * still marks onboarding done, since this must never block SOS or come
 * back to nag the person again on the same device.
 */
export default function ProfileForm({ onDone }: ProfileFormProps) {
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skip = () => {
    markOnboardingDone();
    onDone();
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Name is required — or tap Skip for now.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitProfile({
        deviceIdHash: getOrCreateDeviceIdHash(),
        name: name.trim(),
        mobileNumber: mobileNumber.trim() || undefined,
        email: email.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianEmail: guardianEmail.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        address: address.trim() || undefined,
      });
      markOnboardingDone();
      onDone();
    } catch {
      // Even on failure, don't trap the person here — SOS must remain
      // reachable. They just won't have a guardian contact saved yet.
      setError("Couldn't save right now. You can skip for now — SOS still works either way.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-card border border-border-hairline bg-bg-surface px-3.5 py-2.5 text-[15px] text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent-cyan";

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-bg-void">
      <div className="safe-top flex-1 overflow-y-auto px-5 pb-4 pt-6">
        <h1 className="font-display text-[22px] font-bold text-text-primary">Set up your profile</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-muted">
          Optional, one-time — helps rescuers reach you and lets a guardian get notified automatically
          when you send an SOS. You can skip this and SOS will still work exactly the same.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-text-muted">
              Your name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-text-muted">
                Mobile number
              </label>
              <input
                className={inputClass}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91…"
                type="tel"
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-text-muted">
                Email
              </label>
              <input
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-text-muted">
              Address / area
            </label>
            <input
              className={inputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Neighbourhood, city"
            />
          </div>

          <div className="mt-2 rounded-card border border-border-hairline bg-bg-surface-raised p-3.5">
            <p className="mb-3 text-[13px] font-semibold text-text-primary">Guardian / emergency contact</p>
            <div className="flex flex-col gap-3">
              <input
                className={inputClass}
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian's name"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="Guardian email"
                  type="email"
                />
                <input
                  className={inputClass}
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="Guardian phone"
                  type="tel"
                />
              </div>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
              If a guardian email is set, they'll get an automatic alert when you send an SOS.
            </p>
          </div>

          {error && <p className="text-[13px] text-danger-red">{error}</p>}
        </div>
      </div>

      <div className="safe-bottom flex gap-3 border-t border-border-hairline bg-bg-surface-raised px-5 py-4">
        <button
          type="button"
          onClick={skip}
          disabled={submitting}
          className="flex-1 rounded-card border border-border-hairline py-3 text-[14px] font-semibold text-text-muted disabled:opacity-60"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="flex-1 rounded-card bg-accent-cyan py-3 text-[14px] font-bold text-bg-void disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
