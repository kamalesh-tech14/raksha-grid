import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { SosDeliveryState } from "@raksha-grid/shared-types";
import { PrismaService } from "../prisma.service";
import { CreateSosDto } from "./sos.dto";
import { suggestPriority } from "./priority.util";

// Legal transitions out of each state — enforced server-side so a buggy
// or malicious client can't skip straight from "draft" to "resolved".
const ALLOWED_TRANSITIONS: Record<SosDeliveryState, SosDeliveryState[]> = {
  draft: ["collecting-location", "failed"],
  "collecting-location": ["stored-locally", "failed"],
  "stored-locally": ["checking-routes"],
  "checking-routes": ["queued", "failed"],
  queued: ["sending", "retry-scheduled"],
  sending: ["relay-transferred", "delivered", "retry-scheduled", "failed"],
  "relay-transferred": ["delivered", "retry-scheduled", "failed"],
  delivered: ["acknowledged"],
  acknowledged: ["rescue-assigned"],
  "rescue-assigned": ["help-approaching"],
  "help-approaching": ["resolved"],
  resolved: [],
  "retry-scheduled": ["checking-routes", "failed"],
  failed: ["retry-scheduled"],
};

@Injectable()
export class SosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSosDto, userId: string | undefined, deviceIdHash: string) {
    // Idempotency: replaying the same key returns the existing incident
    // instead of creating a duplicate — required by the "prevent duplicate
    // incidents" rule, and essential for a client that retries after a
    // flaky connection without knowing if the first attempt landed.
    const existing = await this.prisma.sosIncident.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing;

    // SosIncident.deviceId is a FK to Device.id, not the client's own
    // deviceIdHash — upsert-by-hash here since the real DevicesService
    // (registration/lookup) hasn't been built yet (see
    // docs/PHASE-3-ARCHITECTURE.md "What's not done").
    const device = await this.prisma.device.upsert({
      where: { deviceIdHash },
      create: { deviceIdHash, userId, platform: "web" },
      update: { lastSeenAt: new Date(), ...(userId ? { userId } : {}) },
    });

    const aiSuggestedPriority = suggestPriority(
      dto.emergencyType,
      dto.peopleAffected,
      dto.injurySeverity
    );

    const incident = await this.prisma.sosIncident.create({
      data: {
        idempotencyKey: dto.idempotencyKey,
        userId,
        deviceId: device.id,
        emergencyType: dto.emergencyType.replace(/-/g, "_") as any,
        priority: aiSuggestedPriority as any,
        aiSuggestedPriority: aiSuggestedPriority as any,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyMetres: dto.accuracyMetres,
        altitudeMetres: dto.altitudeMetres,
        locationSource: dto.locationSource.replace(/-/g, "_") as any,
        locationCapturedAt: dto.locationCapturedAt ? new Date(dto.locationCapturedAt) : undefined,
        peopleAffected: dto.peopleAffected,
        injurySeverity: dto.injurySeverity,
        mobilityStatus: dto.mobilityStatus,
        shortMessage: dto.shortMessage,
        batteryPercentage: dto.batteryPercentage,
        deliveryState: "stored_locally",
      },
    });

    await this.prisma.incidentUpdate.create({
      data: { incidentId: incident.id, toState: "stored_locally", note: "SOS created" },
    });

    return incident;
  }

  async findOne(id: string) {
    const incident = await this.prisma.sosIncident.findUnique({
      where: { id },
      include: { updates: { orderBy: { createdAt: "asc" } }, deliveryAttempts: true },
    });
    if (!incident) throw new NotFoundException("SOS incident not found");
    return incident;
  }

  /**
   * Deliberately low-detail lookup, safe to expose without auth: an SOS id
   * is effectively an unguessable capability token (uuid), and this never
   * returns coordinates, contact info, or medical fields — only what the
   * reporting client itself needs to show its own transmission-status
   * screen. Full detail stays behind findOne() + the responder-role guard.
   */
  async findStatus(id: string) {
    const incident = await this.prisma.sosIncident.findUnique({
      where: { id },
      select: {
        id: true,
        priority: true,
        deliveryState: true,
        retryCount: true,
        createdAt: true,
        updatedAt: true,
        deliveryAttempts: {
          orderBy: { attemptedAt: "desc" },
          take: 1,
          select: { route: true, simulated: true, attemptedAt: true, delivered: true, acknowledged: true },
        },
      },
    });
    if (!incident) throw new NotFoundException("SOS incident not found");
    return incident;
  }

  /** Priority queue for the rescue dashboard — Phase 8 builds the real UI on top of this. */
  async listQueue() {
    return this.prisma.sosIncident.findMany({
      where: { deliveryState: { notIn: ["resolved"] } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  }

  async transition(id: string, toState: SosDeliveryState, actorUserId: string | undefined, note?: string) {
    const incident = await this.findOne(id);
    const current = incident.deliveryState.replace(/_/g, "-") as SosDeliveryState;
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];

    if (!allowed.includes(toState)) {
      throw new BadRequestException(`Cannot transition from "${current}" to "${toState}"`);
    }

    const updated = await this.prisma.sosIncident.update({
      where: { id },
      data: { deliveryState: toState.replace(/-/g, "_") as any },
    });

    await this.prisma.incidentUpdate.create({
      data: {
        incidentId: id,
        fromState: current,
        toState: toState.replace(/-/g, "_"),
        actorUserId,
        note,
      },
    });

    return updated;
  }
}
