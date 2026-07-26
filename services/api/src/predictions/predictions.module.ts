import { Module } from "@nestjs/common";
import { PredictionsController } from "./predictions.controller";
import { PredictionsService } from "./predictions.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [PredictionsController],
  providers: [PredictionsService, PrismaService],
})
export class PredictionsModule {}
