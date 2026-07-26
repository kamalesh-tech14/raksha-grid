import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@raksha-grid/shared-types";
import { ROLES_KEY } from "./roles.decorator";

/**
 * Enforces role-based access. The role checked here always comes from the
 * verified JWT payload (attached by JwtAuthGuard upstream), never from a
 * request body or query param — "never trust client-provided roles" is a
 * hard security rule for this project.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userRole: UserRole | undefined = request.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException("Insufficient role for this action");
    }
    return true;
  }
}
