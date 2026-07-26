import type { EmergencyPriority, EmergencyType } from "@raksha-grid/shared-types";

/**
 * Deliberately simple rule-based stub for Phase 3 — a real model plugs in
 * later (Phase 6/9) without changing the contract. Per the skill: "AI may
 * recommend priority, but authorised human responders must be able to
 * override it" — this value is always `aiSuggestedPriority`, never the
 * final `priority` field, which stays whatever the responder sets.
 */
export function suggestPriority(
  emergencyType: EmergencyType,
  peopleAffected: number,
  injurySeverity?: string
): EmergencyPriority {
  if (injurySeverity === "critical" || emergencyType === "trapped" || emergencyType === "building-collapse") {
    return "P1";
  }
  if (injurySeverity === "serious" || emergencyType === "medical" || peopleAffected >= 5) {
    return "P2";
  }
  if (emergencyType === "food-water-request") {
    return "P4";
  }
  return "P3";
}
