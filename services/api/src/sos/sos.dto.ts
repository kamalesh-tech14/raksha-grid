import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import type { EmergencyType, LocationSource } from "@raksha-grid/shared-types";

const EMERGENCY_TYPES: EmergencyType[] = [
  "trapped",
  "medical",
  "flood",
  "fire",
  "building-collapse",
  "cyclone",
  "landslide",
  "missing-person",
  "unsafe-location",
  "food-water-request",
  "other",
];

const LOCATION_SOURCES: LocationSource[] = [
  "live-gps",
  "last-known",
  "manual-map",
  "landmark",
  "relay-estimated",
];

class NetworkStateDto {
  @IsBoolean()
  online!: boolean;

  @IsIn(["wifi", "cellular", "sms", "bluetooth-relay", "wifi-direct", "lora-gateway", "satellite-gateway", "none"])
  connectionType!: string;

  @IsOptional()
  @IsIn(["slow-2g", "2g", "3g", "4g", "unknown"])
  effectiveType?: string;

  @IsBoolean()
  relayAvailable!: boolean;

  @IsBoolean()
  loraGatewayAvailable!: boolean;

  @IsBoolean()
  satelliteGatewayAvailable!: boolean;

  @IsBoolean()
  simulated!: boolean;
}

export class CreateSosDto {
  @IsString()
  idempotencyKey!: string;

  @IsString()
  deviceIdHash!: string;

  @IsIn(EMERGENCY_TYPES)
  emergencyType!: EmergencyType;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  accuracyMetres?: number;

  @IsOptional()
  @IsNumber()
  altitudeMetres?: number;

  @IsIn(LOCATION_SOURCES)
  locationSource!: LocationSource;

  @IsOptional()
  @IsString()
  locationCapturedAt?: string;

  @IsInt()
  @Min(1)
  peopleAffected!: number;

  @IsOptional()
  @IsIn(["none", "minor", "serious", "critical", "unknown"])
  injurySeverity?: string;

  @IsOptional()
  @IsIn(["mobile", "limited", "immobile", "unknown"])
  mobilityStatus?: string;

  @IsOptional()
  @IsString()
  shortMessage?: string;

  @IsOptional()
  @IsInt()
  batteryPercentage?: number;

  @ValidateNested()
  @Type(() => NetworkStateDto)
  networkState!: NetworkStateDto;
}
