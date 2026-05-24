import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  type AuthRole,
  hasRequiredRole,
} from "../../../../../packages/modules/auth";
import {
  IS_PUBLIC_KEY,
  ROLES_KEY,
} from "../../../../../packages/modules/auth/src/access-control/metadata.constants";
import type { ApiRequestLike } from "../auth-request.util";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true;

    if (isPublic) {
      return true;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ApiRequestLike>();
    const userRoles = request.authRoles ?? [];

    if (hasRequiredRole(userRoles, requiredRoles)) {
      return true;
    }

    throw new ForbiddenException("Insufficient role.");
  }
}
