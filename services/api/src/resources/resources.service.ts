import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async findShelters() {
    return this.prisma.shelter.findMany({ orderBy: { name: "asc" } });
  }

  async findHospitals() {
    return this.prisma.hospital.findMany({ orderBy: { name: "asc" } });
  }
}
