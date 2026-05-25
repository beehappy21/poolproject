import type { AuthRole, AuthUserSummary } from "../domain/auth.types";

function normalizeRole(value?: string | null): AuthRole | null {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "member" ||
    normalized === "admin" ||
    normalized === "super_admin" ||
    normalized === "system" ||
    normalized === "worker"
  ) {
    return normalized;
  }

  return null;
}

export function getUserRoles(user: AuthUserSummary | null | undefined): AuthRole[] {
  if (!user) {
    return [];
  }

  const roles = new Set<AuthRole>(["member"]);
  const adminRole = normalizeRole(
    String(user.adminRole || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_"),
  );

  if (user.isAdmin === true) {
    roles.add("admin");
  }

  if (adminRole) {
    roles.add(adminRole);
  }

  if (roles.has("super_admin")) {
    roles.add("admin");
  }

  if (roles.has("admin")) {
    roles.add("member");
  }

  return Array.from(roles);
}

export function hasRequiredRole(
  userRoles: AuthRole[],
  requiredRoles: AuthRole[],
): boolean {
  if (requiredRoles.length === 0) {
    return true;
  }

  const availableRoles = new Set(userRoles);
  return requiredRoles.some((role) => availableRoles.has(role));
}
