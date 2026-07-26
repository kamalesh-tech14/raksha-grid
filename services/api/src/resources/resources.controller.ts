import { Controller, Get } from "@nestjs/common";
import { ResourcesService } from "./resources.service";

@Controller()
export class ResourcesController {
  constructor(private resources: ResourcesService) {}

  // Public and unauthenticated — knowing where the nearest shelter/hospital
  // is shouldn't require a login, same reasoning as /predictions.
  @Get("shelters")
  findShelters() {
    return this.resources.findShelters();
  }

  @Get("hospitals")
  findHospitals() {
    return this.resources.findHospitals();
  }
}
