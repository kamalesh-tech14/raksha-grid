import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { CreateProfileDto } from "./profile.dto";

@Controller("profile")
export class ProfileController {
  constructor(private profile: ProfileService) {}

  // Returns null (200) rather than 404 when no profile exists yet — this
  // is a routine "has this device done onboarding" check, not an error.
  @Get(":deviceIdHash")
  findOne(@Param("deviceIdHash") deviceIdHash: string) {
    return this.profile.findByDeviceIdHash(deviceIdHash);
  }

  @Post()
  create(@Body() dto: CreateProfileDto) {
    return this.profile.upsert(dto);
  }
}
