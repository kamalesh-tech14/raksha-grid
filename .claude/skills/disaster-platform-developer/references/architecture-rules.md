# Architecture Rules

Read this before implementing UI, communication/offline logic, or any hardware-adjacent (LoRa/satellite) feature.

## Technology preferences

Use the existing stack when one is already present. For a new prototype, prefer:

**Web:** Next.js, React, TypeScript strict mode, Tailwind CSS, Framer Motion, Progressive Web App support, Mapbox/Leaflet/OpenStreetMap, Zustand or Redux Toolkit when global state is justified.

**Mobile:** React Native with Expo for prototype speed; native modules or bare React Native only when platform APIs require them.

**Backend:** Node.js, NestJS or a similarly structured framework, REST APIs, WebSockets or Server-Sent Events for live updates, Python services for ML workloads, PostgreSQL, PostGIS, Redis, background job queues.

**Validation and testing:** Zod or equivalent runtime validation; unit, integration, end-to-end, accessibility, and offline/network-interruption tests.

Do not add unnecessary dependencies when the existing stack already solves the requirement.

## Mobile-first requirements

Every civilian-facing screen must be designed for mobile first.

* Support screens from approximately 320 px width upward.
* Place primary actions within comfortable thumb reach.
* Use touch targets of at least approximately 44 × 44 px.
* Keep the SOS control visible and easy to reach.
* Avoid horizontal page scrolling.
* Use concise emergency text.
* Use large readable status indicators.
* Support safe-area insets.
* Support one-handed use.
* Provide reduced-motion behaviour.
* Avoid expensive continuous animation.
* Optimise for slower Android devices.
* Provide responsive tablet and desktop layouts only after mobile is complete.

Desktop-first implementations are not acceptable.

## Design system

Use a premium disaster-command visual language.

**Foundations:** deep navy or charcoal background; cyan/electric blue for normal information; amber for warnings; red only for critical danger and SOS states; green for verified success/safety/rescue completion; high contrast typography; rounded cards; controlled glass effects; soft elevation; clear map overlays; restrained motion.

**Interaction rules:** use motion to explain state changes, not decoration; disable/reduce animations during low-power mode; support `prefers-reduced-motion`; never use colour alone to communicate status — pair icons with text; include loading, empty, error, offline, stale-data and permission-denied states.

The interface should feel premium and futuristic but remain calm during emergencies.

## Offline-first requirements

Implement: installable PWA; service-worker application-shell caching; offline emergency guides; locally cached shelter/hospital data; downloadable offline map regions where supported; IndexedDB for the web prototype; secure local database for native mobile; persistent SOS queue; retry with exponential backoff; automatic sync on reconnect; data freshness indicators; last-synchronised timestamps; low-data mode; low-battery emergency mode.

Queued emergency messages must survive: page refresh, application restart, browser/app closure, device sleep where supported, temporary server failure.

Never suggest that browser background execution is guaranteed on every platform.

## Resilient communication architecture

Use a provider-adapter architecture. Potential routes: Wi-Fi internet, mobile data, SMS gateway, nearby Bluetooth relay, Wi-Fi Direct, delay-tolerant device relay, LoRa gateway, satellite IoT gateway, satellite broadband gateway.

Route selection must consider: availability, device support, permissions, message size, urgency, reliability, energy consumption, delivery confirmation, cost, security, duplicate-delivery risk.

Do not treat every route as available on an ordinary smartphone.

### Communication adapter contract

```ts
export type CommunicationRoute =
  | "internet"
  | "sms"
  | "bluetooth-relay"
  | "wifi-direct"
  | "lora-gateway"
  | "satellite-iot"
  | "satellite-broadband";

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

export interface EmergencyCommunicationAdapter {
  readonly route: CommunicationRoute;
  checkAvailability(): Promise<RouteAvailability>;
  sendEmergencyMessage(payload: SosPayload): Promise<DeliveryReceipt>;
  getDeliveryStatus(messageId: string): Promise<DeliveryReceipt>;
  retryMessage(messageId: string): Promise<DeliveryReceipt>;
}
```

Create mock adapters for LoRa and satellite features in the college prototype. Make mock behaviour configurable so the demonstration can show success, delay, failure and retry.

### Communication simulator

Provide a judge-friendly simulation panel.

```ts
export interface CommunicationSimulation {
  internetAvailable: boolean;
  smsAvailable: boolean;
  nearbyRelayAvailable: boolean;
  wifiDirectAvailable: boolean;
  loraGatewayAvailable: boolean;
  satelliteGatewayAvailable: boolean;

  internetLatencyMs: number;
  relayLatencyMs: number;
  satelliteLatencyMs: number;

  forceNextAttemptToFail: boolean;
}
```

The panel should let the presenter: disable internet; activate a nearby relay; activate a LoRa gateway; activate a satellite gateway; trigger an SOS; watch the selected route; see the rescue dashboard receive the incident; send an acknowledgement back to the victim.

Display a communication-route timeline, e.g.:

```text
GPS acquired
→ Stored on device
→ Internet unavailable
→ Nearby relay discovered
→ LoRa gateway reached
→ Satellite gateway forwarded message
→ Rescue dashboard received SOS
→ Rescue acknowledgement returned
```

Every simulated hardware step must display a clear "Prototype simulation" label.

## Satellite requirements

Never claim that a normal website directly connects to a satellite. Real satellite communication requires: compatible satellite hardware, antenna and suitable sky visibility, provider service, subscription or airtime, provider API, approved and lawful deployment, possible regulatory or government integration.

Use satellite connectivity only for compact emergency information unless broadband satellite infrastructure is explicitly available. Suitable payloads: SOS ID, coordinates, location accuracy, timestamp, emergency type, priority, number of people, battery level, short message, delivery status, rescue acknowledgement.

Do not design low-bandwidth satellite IoT transmission for live video, large imagery or continuous map streaming.

## LoRa requirements

Ordinary smartphones do not contain general-purpose LoRa radios. LoRa integration requires: external accessory, community gateway, rescue vehicle gateway, installed emergency node, compatible hardware.

For the prototype: simulate gateway discovery; simulate message forwarding; use a modular adapter; clearly label it as simulation.
