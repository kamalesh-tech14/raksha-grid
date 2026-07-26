# Demo Scenarios

Read this before any demo-prep, presentation, or judge Q&A-facing work.

## College demonstration sequence

Maintain a reliable guided demonstration:

1. Show a simulated flood warning.
2. Open the live risk map.
3. Show the civilian inside a danger zone.
4. Disable internet in the communication simulator.
5. Activate SOS.
6. Obtain GPS coordinates.
7. Store the SOS offline.
8. Simulate discovery of a nearby relay.
9. Forward through simulated LoRa and satellite gateways.
10. Show the incident appearing on the rescue dashboard.
11. Display suggested priority.
12. Assign a volunteer or rescue team.
13. Return an acknowledgement to the victim.
14. Navigate using offline map data.
15. Mark the rescue resolved.
16. Display a technical architecture explanation.

The demo must remain usable even when external APIs are unavailable.

## Judge-facing explanation

When explaining the system, use this technically accurate position:

> "The phone can obtain GPS coordinates without relying on a mobile tower when device location services and satellite visibility permit. Transmitting those coordinates requires an available communication path. Our prototype stores the SOS locally and demonstrates modular routing through internet, nearby-device relays, LoRa gateways and satellite gateways. Hardware-dependent routes are clearly simulated in the college prototype and can later be replaced with authorised provider integrations."

## Never say

* The website directly connects to satellites.
* GPS guarantees exact location.
* Bluetooth provides unlimited or kilometre-scale coverage.
* The prototype already provides a guaranteed national emergency service.
* Satellite transmission works without compatible hardware.
