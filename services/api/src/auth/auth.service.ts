import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomUUID, createHash } from "crypto";
import type { AuthTokenPair } from "@raksha-grid/shared-types";
import { PrismaService } from "../prisma.service";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TTL = "15m";

function hashToken(token: string): string {
  // Refresh tokens are stored hashed, never in plaintext — same principle
  // as passwords, since a leaked DB shouldn't hand out working sessions.
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    return user;
  }

  private signAccessToken(user: { id: string; role: string; email: string }) {
    return this.jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: ACCESS_TTL }
    );
  }

  /** Issues a brand-new session family — used on login. */
  async issueSession(user: { id: string; role: string; email: string }): Promise<AuthTokenPair> {
    const familyId = randomUUID();
    return this.issueTokenPair(user, familyId);
  }

  private async issueTokenPair(
    user: { id: string; role: string; email: string },
    familyId: string
  ): Promise<AuthTokenPair> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = randomUUID() + randomUUID(); // opaque, not a JWT

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Refresh-token rotation: every refresh call issues a new refresh token
   * and marks the old one used (`replacedBy`). If a token that's already
   * been replaced is presented again — meaning it was stolen and the thief
   * raced the real user — the entire family is revoked, killing every
   * session descended from that token, not just the one being replayed.
   */
  async rotateRefreshToken(presentedToken: string): Promise<AuthTokenPair> {
    const tokenHash = hashToken(presentedToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token invalid or expired");
    }

    if (record.replacedBy) {
      // Reuse of an already-rotated token — treat as compromise.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected — session revoked");
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
    const newPair = await this.issueTokenPair(user, record.familyId);

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { replacedBy: newPair.refreshToken, revokedAt: new Date() },
    });

    return newPair;
  }

  async revokeSessionFamily(presentedToken: string): Promise<void> {
    const tokenHash = hashToken(presentedToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
