import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "./auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    return this.auth.issueSession({ id: user.id, role: user.role, email: user.email });
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.rotateRefreshToken(dto.refreshToken);
  }

  @Post("logout")
  async logout(@Body() dto: RefreshDto) {
    await this.auth.revokeSessionFamily(dto.refreshToken);
    return { revoked: true };
  }
}
