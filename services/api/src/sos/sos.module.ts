import { Module } from "@nestjs/common";
import { SosController } from "./sos.controller";
import { SosService } from "./sos.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [SosController],
  providers: [SosService, PrismaService],
})
export class SosModule {}
