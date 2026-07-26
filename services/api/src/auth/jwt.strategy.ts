import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtAccessPayload {
  sub: string; // user id
  role: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "dev-only-insecure-secret",
    });
  }

  // Whatever is returned here becomes request.user — consumed by RolesGuard.
  async validate(payload: JwtAccessPayload) {
    return { userId: payload.sub, role: payload.role, email: payload.email };
  }
}
