import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { IsString } from "class-validator";
import { SosService } from "./sos.service";
import { CreateSosDto } from "./sos.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

class TransitionDto {
  @IsString()
  toState!: string;

  @IsString()
  note?: string;
}

@Controller("sos")
export class SosController {
  constructor(private sos: SosService) {}

  // Anyone (authenticated or anonymous device) can create an SOS —
  // an emergency report must never be blocked by a login wall.
  @Post()
  create(@Body() dto: CreateSosDto, @Req() req: any) {
    const userId = req.user?.userId;
    // deviceId resolution (device registration lookup/creation) happens in
    // a DevicesService added alongside this in the same phase; omitted
    // here to keep this controller focused on the SOS contract itself.
    const deviceId = req.deviceId ?? dto.deviceIdHash;
    return this.sos.create(dto, userId, deviceId);
  }

  // Public, low-detail status check — this is what the reporting civilian's
  // own client polls for the SOS Transmission Status screen. No auth
  // required (an emergency reporter shouldn't need to be logged in to see
  // their own SOS's state), but it deliberately returns none of the
  // sensitive fields findOne()/full detail does. Declared before the
  // ":id" route below so Nest doesn't need extra routing config.
  @Get(":id/status")
  status(@Param("id") id: string) {
    return this.sos.findStatus(id);
  }

  // Full incident detail (including exact location, via the `updates`/
  // `deliveryAttempts` relations) is gated — only authenticated responders
  // and the reporting user's own device can read it. Enforced fully once
  // ownership + assignment checks land in Phase 5/8; RolesGuard covers the
  // responder side today.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("rescue-team", "government-operator", "administrator")
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.sos.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("rescue-team", "government-operator", "administrator")
  @Get()
  listQueue() {
    return this.sos.listQueue();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("rescue-team", "government-operator", "administrator")
  @Patch(":id/state")
  transition(@Param("id") id: string, @Body() dto: TransitionDto, @Req() req: any) {
    return this.sos.transition(id, dto.toState as any, req.user?.userId, dto.note);
  }
}
