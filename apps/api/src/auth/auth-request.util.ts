import { UnauthorizedException } from "@nestjs/common";

import type { AuthRole, AuthUserSummary } from "../../../../packages/modules/auth";

export interface ApiRequestLike {
  method?: string;
  headers: {
    authorization?: string;
    cookie?: string;
  };
  authAccess?: "public" | "member" | "admin";
  authRoles?: AuthRole[];
  authToken?: string;
  authUser?: AuthUserSummary;
}

export function extractAccessToken(request: ApiRequestLike): string | null {
  const normalized = String(request.headers.authorization || "").trim();

  if (normalized.toLowerCase().startsWith("bearer ")) {
    const token = normalized.slice(7).trim();
    return token || null;
  }

  return readCookie(request.headers.cookie, "adminAccessToken");
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  const source = cookieHeader || "";
  const prefix = `${name}=`;

  for (const part of source.split(";")) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }

  return null;
}

export function requireAuthenticatedUser(request: ApiRequestLike): AuthUserSummary {
  if (!request.authUser) {
    throw new UnauthorizedException("Invalid session.");
  }

  return request.authUser;
}

export function resolveAuditAccess(
  isPublic: boolean,
  requiredRoles: AuthRole[],
): "public" | "member" | "admin" {
  if (isPublic) {
    return "public";
  }

  return requiredRoles.some((role) => role !== "member") ? "admin" : "member";
}
