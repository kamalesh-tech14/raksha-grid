import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { SosModule } from "./sos/sos.module";
import { PredictionsModule } from "./predictions/predictions.module";
import { ResourcesModule } from "./resources/resources.module";
import { ProfileModule } from "./profile/profile.module";

@Module({
  imports: [AuthModule, SosModule, PredictionsModule, ResourcesModule, ProfileModule],
})
export class AppModule {}
