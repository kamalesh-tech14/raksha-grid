import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns currently-valid predictions, optionally filtered to one
   * region. If the table is empty (fresh install, seed not run yet),
   * returns an empty array rather than fabricating data on the fly —
   * the frontend's empty state is the honest response to "no data exists
   * yet", not a reason to fake something that looks like data.
   */
  async findActive(regionId?: string) {
    return this.prisma.disasterPrediction.findMany({
      where: {
        validUntil: { gte: new Date() },
        ...(regionId ? { regionId } : {}),
      },
      orderBy: [{ probability: "desc" }],
    });
  }
}
