import { createHmac, randomBytes } from "node:crypto";

const DEFAULT_NON_PROD_HMAC_SECRET =
  "local-auth-session-hmac-secret-0123456789abcdef";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getSessionHashSecret(): string {
  const secret = (
    process.env.AUTH_SESSION_HMAC_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_NON_PROD_HMAC_SECRET)
  ).trim();

  if (!secret) {
    throw new Error("AUTH_SESSION_HMAC_SECRET is required for session token hashing.");
  }

  return secret;
}

export function hashSessionToken(
  token: string,
  secret = getSessionHashSecret(),
): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
