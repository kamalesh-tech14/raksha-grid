// Shared between apps/web, services/api and any future mobile app.
// Source of truth is .claude/skills/disaster-platform-developer/references/product-requirements.md
// — if you change a shape, update that file too.

export type EmergencyPriority = "P1" | "P2" | "P3" | "P4";

export type EmergencyType =
  | "trapped"
  | "medical"
  | "flood"
  | "fire"
  | "building-collapse"
  | "cyclone"
  | "landslide"
  | "missing-person"
  | "unsafe-location"
  | "food-water-request"
  | "other";

export type LocationSource =
  | "live-gps"
  | "last-known"
  | "manual-map"
  | "landmark"
  | "relay-estimated";

export type SosDeliveryState =
  | "draft"
  | "collecting-location"
  | "stored-locally"
  | "checking-routes"
  | "queued"
  | "sending"
  | "relay-transferred"
  | "delivered"
  | "acknowledged"
  | "rescue-assigned"
  | "help-approaching"
  | "resolved"
  | "retry-scheduled"
  | "failed";

export type CommunicationRoute =
  | "internet"
  | "sms"
  | "bluetooth-relay"
  | "wifi-direct"
  | "lora-gateway"
  | "satellite-iot"
  | "satellite-broadband";

export interface NetworkState {
  online: boolean;
  connectionType:
    | "wifi"
    | "cellular"
    | "sms"
    | "bluetooth-relay"
    | "wifi-direct"
    | "lora-gateway"
    | "satellite-gateway"
    | "none";
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  relayAvailable: boolean;
  loraGatewayAvailable: boolean;
  satelliteGatewayAvailable: boolean;
  simulated: boolean;
}

export interface SosPayload {
  id: string;
  idempotencyKey: string;
  userId?: string;
  deviceIdHash: string;

  emergencyType: EmergencyType;
  priority: EmergencyPriority;

  latitude?: number;
  longitude?: number;
  accuracyMetres?: number;
  altitudeMetres?: number;
  locationSource: LocationSource;
  locationCapturedAt?: string;

  peopleAffected: number;
  injurySeverity?: "none" | "minor" | "serious" | "critical" | "unknown";
  mobilityStatus?: "mobile" | "limited" | "immobile" | "unknown";
  shortMessage?: string;

  batteryPercentage?: number;
  networkState: NetworkState;
  deliveryState: SosDeliveryState;

  createdAt: string;
  updatedAt: string;
  retryCount: number;
}

/** What the client sends to create an SOS — server fills in the rest. */
export type CreateSosRequest = Pick<
  SosPayload,
  | "idempotencyKey"
  | "deviceIdHash"
  | "emergencyType"
  | "latitude"
  | "longitude"
  | "accuracyMetres"
  | "altitudeMetres"
  | "locationSource"
  | "locationCapturedAt"
  | "peopleAffected"
  | "injurySeverity"
  | "mobilityStatus"
  | "shortMessage"
  | "batteryPercentage"
  | "networkState"
> & { userId?: string };

export interface RouteAvailability {
  available: boolean;
  simulated: boolean;
  estimatedLatencyMs?: number;
  supportsAcknowledgement: boolean;
  maxPayloadBytes?: number;
  reason?: string;
}

export interface DeliveryReceipt {
  messageId: string;
  route: CommunicationRoute;
  accepted: boolean;
  delivered: boolean;
  acknowledged: boolean;
  providerReference?: string;
  attemptedAt: string;
  deliveredAt?: string;
  errorCode?: string;
  errorMessage?: string;
}
