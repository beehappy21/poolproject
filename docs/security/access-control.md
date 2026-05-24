# Access Control

The API now uses a deny-by-default policy.

- Every route is private unless it is explicitly marked with `@Public()`.
- Use `@Roles(...)` on routes or controllers that require a specific authenticated role.
- Never introduce a new public API route without explicit review.

## Public routes

Use `@Public()` only for endpoints that are intentionally reachable without authentication, such as health checks, login, signup, or webhooks with their own signature validation.

```ts
@Public()
@Get("health")
getHealth() {
  return { status: "ok" };
}
```

## Member routes

Use `@Roles("member")` for authenticated member routes. Admin and super admin sessions also satisfy member access.

```ts
@Roles("member")
@Get("auth/me")
getCurrentSession() {
  // ...
}
```

## Admin routes

Use `@Roles("admin")` for admin-only operations. Super admins inherit admin access.

```ts
@Roles("admin")
@Post("orders/:orderId/approve")
approveOrder() {
  // ...
}
```

## Other supported roles

The role decorator also supports:

- `super_admin`
- `system`
- `worker`

Only use these when a route is intentionally reserved for those actors.

## Response behavior

- Public route + no token: allowed
- Private route + no token: `401 Unauthorized`
- Private route + invalid token: `401 Unauthorized`
- Authenticated route + missing required role: `403 Forbidden`

## Testing Policy

- Public route tests should include at least health and login smoke coverage
- Protected route tests should verify both `401 Unauthorized` and `403 Forbidden` behavior
- New public APIs require explicit `@Public()` and test coverage

## Review rule

Any new public endpoint must be explicitly decorated with `@Public()` and reviewed as part of the PR.

Follow-up:
- Clean up duplicated pre-guard admin checks and standardize `401`/`403` behavior
