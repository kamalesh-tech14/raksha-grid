import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@raksha-grid/shared-types";

export const ROLES_KEY = "roles";

/** Usage: @Roles("rescue-team", "administrator") above a controller method. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
