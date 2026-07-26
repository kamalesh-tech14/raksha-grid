import { Controller, Get, Query } from "@nestjs/common";
import { PredictionsService } from "./predictions.service";

@Controller("predictions")
export class PredictionsController {
  constructor(private predictions: PredictionsService) {}

  // Public and unauthenticated on purpose — disaster risk information is
  // exactly the kind of thing that shouldn't require a login to see.
  @Get()
  findActive(@Query("regionId") regionId?: string) {
    return this.predictions.findActive(regionId);
  }
}
