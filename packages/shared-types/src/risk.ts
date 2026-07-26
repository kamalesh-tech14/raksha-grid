export interface DisasterRiskPrediction {
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
}

export type UserRole =
  | "civilian"
  | "volunteer"
  | "rescue-team"
  | "hospital-operator"
  | "shelter-operator"
  | "ngo-coordinator"
  | "government-operator"
  | "administrator";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

/** Returned by POST /auth/login and POST /auth/refresh. */
export interface AuthTokenPair {
  accessToken: string;
  /** Short-lived; rotated on every refresh — see docs/PHASE-3-ARCHITECTURE.md */
  refreshToken: string;
  accessTokenExpiresAt: string;
}
