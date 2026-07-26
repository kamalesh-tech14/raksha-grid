# Product Requirements

Read this before building civilian screens, SOS logic, risk intelligence, mapping, volunteer/rescue workflows, security, accessibility, performance, or tests.

## Core application roles

Support these roles: Civilian, Volunteer, Rescue team, Hospital operator, Shelter operator, NGO coordinator, Government control-room operator, Administrator.

Implement role-based permissions. Do not expose sensitive rescue controls or exact victim coordinates to unauthorised users.

## Required mobile screens

Build or preserve these primary screens:

1. Onboarding
2. Permission setup
3. Civilian home dashboard
4. Live risk map
5. Disaster detail
6. Alerts
7. SOS activation
8. SOS emergency form
9. SOS transmission status
10. Offline emergency centre
11. Offline maps
12. Shelters and hospitals
13. Emergency guides
14. AI emergency assistant
15. Family safety check-in
16. Profile and medical emergency profile
17. Communication status
18. Settings and accessibility

Recommended mobile navigation: Home, Risk Map, SOS, Alerts, More.

The SOS action must be visually dominant without causing accidental activation.

## SOS activation requirements

* Press and hold for approximately two to three seconds.
* Show an animated confirmation ring or countdown.
* Provide haptic feedback where supported.
* Allow cancellation before activation.
* Support an optional silent SOS mode.
* Immediately begin obtaining location and emergency metadata.
* Do not force users through long forms before storing the SOS.

## SOS payload

```ts
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
```

Validate every payload before storage and transmission.

## SOS delivery states

```ts
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
```

Rules:

* Never display "Delivered" without delivery confirmation.
* Never display "Acknowledged" until a receiving system confirms it.
* Distinguish stored locally from transmitted.
* Always show the last attempted route.
* Show the time of the last status update.
* Preserve state across app restart.
* Use idempotency protection to prevent duplicate incidents.

## Network state model

```ts
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
```

Do not claim the browser can reliably detect every communication system. Use provider adapters and explicit simulation controls for prototype-only channels.

## Location rules

GPS acquisition and message transmission are separate operations. A phone may obtain location without mobile internet when location hardware, permissions and environmental conditions permit.

The application must display: latitude and longitude, accuracy estimate, location source, capture time, whether the location is live or last known, whether it exists only locally, whether it has been transmitted.

Never call a stale or cached position "live location".

Fallback order:
1. Fresh GPS fix.
2. Last known location.
3. Cached movement history.
4. Nearby relay-node estimate.
5. User-selected position on offline map.
6. Manually entered landmark.

If location cannot be obtained, still store the SOS with the available emergency details.

## Risk intelligence

Support demonstration modules for: floods, cyclones, heatwaves, wildfires, landslides, heavy rainfall, urban waterlogging, coastal storm surge, air-quality emergencies, earthquake information feeds.

```ts
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
```

Never present mock predictions as official warnings. Display: demonstration-data badge, confidence, data source, last updated time, validity period, "Why this warning?" explanation.

## GIS and mapping

The risk map should support: current and last-known user position, location accuracy circle, risk polygons, safe zones, flood depth, cyclone route, fire spread, shelters, hospitals, police and fire stations, relief camps, road closures, SOS markers, rescue units, LoRa nodes, satellite gateways.

Requirements: marker clustering, layer controls, map legend, time slider, offline-state indicator, accessible list alternative, performance optimisation, no unnecessary rerendering of the entire map.

## Volunteer workflow

Verified volunteers may: receive relevant incidents, accept or decline missions, view authorised location information, navigate offline, mark themselves en route, mark arrival, report victim located, request backup, request medical support, report unsafe conditions, complete rescue.

Assign missions based on: distance, skills, training, availability, transport, incident priority, local risk conditions.

Do not expose exact coordinates to unverified volunteers.

## Rescue dashboard

The command dashboard must include: live incident map, priority queue, incident detail panel, SOS status timeline, responder assignments, volunteers, hospitals, shelter capacity, rescue vehicles, road closures, resources, communication route status, gateway status, delivery failures, audit logs, filters and search.

Critical responder actions require confirmation, permission checks, audit records, and clear success or failure feedback.

## AI emergency assistant

May provide: first-aid guidance, CPR guidance, flood safety, fire evacuation, cyclone preparation, heatstroke first response, landslide safety, shelter guidance.

Rules: use concise step-by-step instructions; avoid diagnosis; never claim to replace emergency professionals; distinguish online generated guidance from offline verified content; support text-to-speech architecture; support multilingual content; use a curated offline emergency knowledge base for offline mode.

## Security rules

Implement: authentication, refresh-token rotation, role-based access control, sensitive-field authorisation, encryption in transit, encryption at rest, encrypted local storage where possible, runtime input validation, rate limiting, anti-spam/abuse protection, device registration, session revocation, audit logging, data minimisation, location privacy, secure secret handling, secure file upload validation, idempotent SOS handling.

Never: hard-code credentials, place secrets in frontend code, log medical information or exact coordinates unnecessarily, publicly expose exact victim locations, trust client-provided roles, mark simulated delivery as genuine delivery.

## Accessibility

Support: screen readers, keyboard navigation, high contrast, text scaling, reduced motion, colour-blind-safe indicators, large touch targets, icon and text labels, voice guidance architecture, vibration patterns where supported, simple emergency language.

Use ARIA only when semantic HTML cannot express the interaction correctly.

## Performance

Use: code splitting, lazy loading, dynamic map loading, image optimisation, marker clustering, virtualised long lists, cached application shell, IndexedDB, compressed emergency payloads, network timeouts, retry with exponential backoff, low-data mode, low-power mode.

Avoid: huge animation libraries for minor effects, large autoplay videos, excessive glass blur, continuous location polling without need, large uncompressed map or prediction payloads.

## Required UX states

Every major screen or feature must provide: loading, empty, success, error, offline, stale data, partial success, permission denied, retry, hardware unavailable, simulation, unsupported browser, low battery.

## Testing requirements

For every completed module, add appropriate tests. Essential scenarios: internet lost during SOS; app refreshed after offline SOS; GPS permission denied; GPS unavailable; last-known location used; duplicate SOS submission; backend timeout; delayed delivery acknowledgement; relay unavailable; satellite mock failure; retry succeeds; low battery mode; rescue dashboard reconnects; unauthorised exact-location access; mobile responsive layout; keyboard and screen-reader navigation.

Do not consider a module complete merely because it visually renders.
