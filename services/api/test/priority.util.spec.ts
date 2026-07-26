import { suggestPriority } from "../src/sos/priority.util";

describe("suggestPriority", () => {
  it("returns P1 for trapped emergencies", () => {
    expect(suggestPriority("trapped", 1)).toBe("P1");
  });

  it("returns P1 when injury severity is critical regardless of type", () => {
    expect(suggestPriority("other", 1, "critical")).toBe("P1");
  });

  it("returns P2 for medical emergencies", () => {
    expect(suggestPriority("medical", 1)).toBe("P2");
  });

  it("returns P2 when many people are affected", () => {
    expect(suggestPriority("other", 6)).toBe("P2");
  });

  it("returns P4 for resource requests", () => {
    expect(suggestPriority("food-water-request", 1)).toBe("P4");
  });

  it("falls back to P3", () => {
    expect(suggestPriority("unsafe-location", 1)).toBe("P3");
  });
});

// State-transition legality is exercised indirectly through SosService in
// an integration test once a test database is wired up (see
// docs/PHASE-3-ARCHITECTURE.md "Testing plan") — kept out of this unit
// suite so it doesn't require a live Postgres connection to run.
