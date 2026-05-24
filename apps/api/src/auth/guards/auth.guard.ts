import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  AuthService,
  type AuthRole,
  getUserRoles,
} from "../../../../../packages/modules/auth";
import { IS_PUBLIC_KEY, ROLES_KEY } from "../../../../../packages/modules/auth/src/access-control/metadata.constants";
import {
  extractAccessToken,
  resolveAuditAccess,
  type ApiRequestLike,
} from "../auth-request.util";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiRequestLike>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true;
    const requiredRoles =
      this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    request.authAccess = resolveAuditAccess(isPublic, requiredRoles);

    if (request.method === "OPTIONS" || isPublic) {
      request.authRoles = [];
      return true;
    }

    const token = extractAccessToken(request);

    if (!token) {
      throw new UnauthorizedException("Session required.");
    }

    const user = await this.authService.getSessionUser(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    request.authToken = token;
    request.authUser = user;
    request.authRoles = getUserRoles(user);
    return true;
  }
}
