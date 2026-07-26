import { Module } from "@nestjs/common";
import { ResourcesController } from "./resources.controller";
import { ResourcesService } from "./resources.service";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, PrismaService],
})
export class ResourcesModule {}
