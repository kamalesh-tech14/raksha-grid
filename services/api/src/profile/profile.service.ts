import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateProfileDto } from "./profile.dto";

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // Public and unauthenticated, same reasoning as everywhere else in this
  // app: civilians never see a login screen. deviceIdHash (from
  // localStorage) is the only identity here.
  async findByDeviceIdHash(deviceIdHash: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceIdHash },
      include: { profile: true },
    });
    return device?.profile ?? null;
  }

  async upsert(dto: CreateProfileDto) {
    const device = await this.prisma.device.upsert({
      where: { deviceIdHash: dto.deviceIdHash },
      create: { deviceIdHash: dto.deviceIdHash, platform: "web" },
      update: { lastSeenAt: new Date() },
    });

    const data = {
      name: dto.name,
      mobileNumber: dto.mobileNumber,
      email: dto.email,
      guardianName: dto.guardianName,
      guardianEmail: dto.guardianEmail,
      guardianPhone: dto.guardianPhone,
      address: dto.address,
    };

    return this.prisma.profile.upsert({
      where: { deviceId: device.id },
      create: { deviceId: device.id, ...data },
      update: data,
    });
  }
}
