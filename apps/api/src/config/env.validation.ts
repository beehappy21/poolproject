import { readFileSync } from "node:fs";

export type SupportedNodeEnv =
  | "development"
  | "test"
  | "staging"
  | "production";

export interface ValidateApiEnvironmentOptions {
  sourceName?: string;
}

export class ApiEnvironmentValidationError extends Error {
  constructor(
    public readonly issues: string[],
    public readonly sourceName: string,
  ) {
    super(formatApiEnvironmentValidationError(issues, sourceName));
    this.name = "ApiEnvironmentValidationError";
  }
}

const SUPPORTED_NODE_ENVS: SupportedNodeEnv[] = [
  "development",
  "test",
  "staging",
  "production",
];

const FORBIDDEN_SECRET_VALUES = new Set([
  "",
  "changeme",
  "change-me",
  "default",
  "secret",
  "password",
  "admin",
  "test",
  "dev",
  "local",
  "a1a1a1",
  "472121",
  "@4721funnylife",
  "local-bao-internal-token-20260508",
]);

const FORBIDDEN_SECRET_PATTERNS = [
  "replace-with-real",
  "set-in-real-env-only",
  "user:password",
  "redishost",
  "redis_host",
  "db_host",
  "example-secret",
];

const FORBIDDEN_PRODUCTION_IDENTITY_VALUES = new Set([
  "dev-admin@example.com",
  "adminlocal001",
]);

const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 12;

export function validateApiEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  options?: ValidateApiEnvironmentOptions,
): string[] {
  const issues: string[] = [];
  const sourceName = options?.sourceName || "process.env";
  const normalizedNodeEnv = normalizeOptional(env.NODE_ENV) || "development";

  if (!SUPPORTED_NODE_ENVS.includes(normalizedNodeEnv as SupportedNodeEnv)) {
    issues.push(
      `NODE_ENV must be one of ${SUPPORTED_NODE_ENVS.join(", ")}.`,
    );
    return issues;
  }

  const isProduction = normalizedNodeEnv === "production";

  validateOptionalPositiveInteger(env, "APP_PORT", issues);
  validateOptionalPositiveInteger(env, "APP_TRUST_PROXY_HOPS", issues);
  validateOptionalSizeLimit(env, "APP_BODY_LIMIT", issues);
  validateOptionalSizeLimit(env, "APP_UPLOAD_BODY_LIMIT", issues);
  validateOptionalPositiveInteger(env, "APP_UPLOAD_MAX_BASE64_BYTES", issues);
  validateOptionalBoolean(env, "APP_ENABLE_HSTS", issues);
  validateOptionalPositiveInteger(env, "APP_RATE_LIMIT_WINDOW_MS", issues);
  validateOptionalPositiveInteger(env, "APP_RATE_LIMIT_MAX_REQUESTS", issues);
  validateOptionalPositiveInteger(env, "RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "RATE_LIMIT_MAX_REQUESTS", issues);
  validateOptionalNonEmptyString(env, "RATE_LIMIT_KEY_PREFIX", issues);
  validateOptionalPositiveInteger(env, "AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "AUTH_LOGIN_RATE_LIMIT_MAX", issues);
  validateOptionalPositiveInteger(env, "LINE_LOGIN_RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "LINE_LOGIN_RATE_LIMIT_MAX", issues);
  validateOptionalPositiveInteger(env, "ADMIN_AUTH_RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "ADMIN_AUTH_RATE_LIMIT_MAX", issues);
  validateOptionalPositiveInteger(env, "ORDER_RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "ORDER_RATE_LIMIT_MAX", issues);
  validateOptionalPositiveInteger(env, "UPLOAD_RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "UPLOAD_RATE_LIMIT_MAX", issues);
  validateOptionalPositiveInteger(env, "PUBLIC_CATALOG_RATE_LIMIT_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "PUBLIC_CATALOG_RATE_LIMIT_MAX", issues);
  validateOptionalPositiveInteger(env, "AUTH_LOGIN_LOCK_WINDOW_SECONDS", issues);
  validateOptionalPositiveInteger(env, "AUTH_LOGIN_LOCK_MAX_FAILURES", issues);
  validateOptionalPositiveInteger(env, "AUTH_LOGIN_LOCK_DURATION_SECONDS", issues);
  validateOptionalNonEmptyString(env, "AUTH_LOGIN_BRUTE_FORCE_KEY_PREFIX", issues);
  validateOptionalPositiveInteger(env, "AUTH_SESSION_TTL_SECONDS", issues);
  validateOptionalNonEmptyString(env, "AUTH_SESSION_KEY_PREFIX", issues);

  if (!isProduction) {
    return issues;
  }

  requirePresent(env, "NODE_ENV", issues);
  requireUrl(env, "DATABASE_URL", issues, { allowNonHttp: true });
  rejectUnsafeDatabaseUrl(env, issues);

  requireUrl(env, "APP_WAP_URL", issues);
  requireOneOf(env, ["APP_PUBLIC_BASE_URL", "APP_BASE_URL"], issues);
  validateUrlIfPresent(env, "APP_PUBLIC_BASE_URL", issues);
  validateUrlIfPresent(env, "APP_BASE_URL", issues);
  requireOneOf(env, ["APP_REDIS_URL", "REDIS_URL"], issues);
  validateUrlIfPresent(env, "APP_REDIS_URL", issues, { allowNonHttp: true });
  validateUrlIfPresent(env, "REDIS_URL", issues, { allowNonHttp: true });
  requireUrl(env, "INTERNAL_BAO_BASE_URL", issues);

  requireCorsOrigins(env, issues);
  requireSafeProductionBodyLimit(env, issues);

  requireSecret(env, "INTERNAL_RECEIPT_TOKEN", issues, MIN_SECRET_LENGTH);
  requireSecret(env, "AUTH_SESSION_HMAC_SECRET", issues, MIN_SECRET_LENGTH);
  requirePassword(env, "SUPER_ADMIN_PASSWORD", issues, MIN_PASSWORD_LENGTH);
  requirePassword(
    env,
    "SUPER_ADMIN_OVERRIDE_PASSWORD",
    issues,
    MIN_PASSWORD_LENGTH,
  );

  requirePresent(env, "SUPER_ADMIN_EMAIL", issues);
  requirePresent(env, "SUPER_ADMIN_MEMBER_CODE", issues);
  rejectUnsafeIdentityValue(env, "SUPER_ADMIN_EMAIL", issues);
  rejectUnsafeIdentityValue(env, "SUPER_ADMIN_MEMBER_CODE", issues);

  if (normalizeOptional(env.DEV_MEMBER_IMPERSONATION_PASSWORD)) {
    issues.push(
      "DEV_MEMBER_IMPERSONATION_PASSWORD must not be set in production.",
    );
  }

  const lineLoginEnabled = isLineLoginEnabled(env);
  if (lineLoginEnabled) {
    requireOneOf(env, ["LINE_CHANNEL_ID", "LINE_LOGIN_CHANNEL_ID"], issues);
    requireOneOf(
      env,
      ["LINE_CHANNEL_SECRET", "LINE_LOGIN_CHANNEL_SECRET"],
      issues,
    );
    requireUrl(env, "LINE_LOGIN_CALLBACK_URL", issues);
    requirePresent(env, "LINE_LIFF_ID", issues);
    requireUrl(env, "LINE_LIFF_SIGNIN_URL", issues);

    if (normalizeOptional(env.LINE_STRICT_VERIFY) !== "true") {
      issues.push("LINE_STRICT_VERIFY must be true in production when LINE login is enabled.");
    }

    requireSecretLikeIfPresent(env, "LINE_CHANNEL_SECRET", issues);
    requireSecretLikeIfPresent(env, "LINE_LOGIN_CHANNEL_SECRET", issues);
  }

  if (issues.length > 0) {
    return issues;
  }

  return issues;
}

export function assertValidApiEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  options?: ValidateApiEnvironmentOptions,
): void {
  const sourceName = options?.sourceName || "process.env";
  const issues = validateApiEnvironment(env, options);

  if (issues.length > 0) {
    throw new ApiEnvironmentValidationError(issues, sourceName);
  }
}

export function formatApiEnvironmentValidationError(
  issues: string[],
  sourceName: string,
): string {
  return [
    `Invalid API environment configuration in ${sourceName}:`,
    ...issues.map((issue) => `- ${issue}`),
  ].join("\n");
}

export function parseEnvFile(source: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    result[key] = stripWrappingQuotes(rawValue);
  }

  return result;
}

export function readEnvFile(path: string): Record<string, string> {
  return parseEnvFile(readFileSync(path, "utf8"));
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeOptional(value: string | undefined | null): string {
  return String(value || "").trim();
}

function requirePresent(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  if (!normalizeOptional(env[key])) {
    issues.push(`${key} is required in production.`);
  }
}

function requireOneOf(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  keys: string[],
  issues: string[],
): void {
  const hasAnyValue = keys.some((key) => normalizeOptional(env[key]));
  if (!hasAnyValue) {
    issues.push(`One of ${keys.join(" or ")} is required in production.`);
  }
}

function validateOptionalPositiveInteger(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    return;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    issues.push(`${key} must be a positive integer.`);
  }
}

function validateOptionalBoolean(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    return;
  }

  if (value !== "true" && value !== "false") {
    issues.push(`${key} must be true or false.`);
  }
}

function validateOptionalSizeLimit(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  const value = normalizeOptional(env[key]).toLowerCase();
  if (!value) {
    return;
  }

  if (!parseSizeLimitBytes(value)) {
    issues.push(`${key} must be a positive size such as 512kb, 1mb, or 8mb.`);
  }
}

function requireSafeProductionBodyLimit(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  issues: string[],
): void {
  const bodyLimit = parseSizeLimitBytes(normalizeOptional(env.APP_BODY_LIMIT) || "1mb");
  const uploadLimit = parseSizeLimitBytes(normalizeOptional(env.APP_UPLOAD_BODY_LIMIT) || "8mb");

  if (!bodyLimit || bodyLimit > 2 * 1024 * 1024) {
    issues.push("APP_BODY_LIMIT must be 2mb or lower in production.");
  }

  if (!uploadLimit || uploadLimit > 10 * 1024 * 1024) {
    issues.push("APP_UPLOAD_BODY_LIMIT must be 10mb or lower in production.");
  }
}

function parseSizeLimitBytes(value: string): number | null {
  const match = value.trim().toLowerCase().match(/^(\d+)(b|kb|mb)?$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2] || "b";
  if (unit === "mb") {
    return amount * 1024 * 1024;
  }
  if (unit === "kb") {
    return amount * 1024;
  }

  return amount;
}

function validateOptionalNonEmptyString(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  if (!(key in env)) {
    return;
  }

  if (!normalizeOptional(env[key])) {
    issues.push(`${key} must not be empty when provided.`);
  }
}

function requireUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
  options?: { allowNonHttp?: boolean },
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    issues.push(`${key} is required in production.`);
    return;
  }

  validateUrlValue(key, value, issues, options);
}

function validateUrlIfPresent(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
  options?: { allowNonHttp?: boolean },
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    return;
  }

  validateUrlValue(key, value, issues, options);
}

function validateUrlValue(
  key: string,
  value: string,
  issues: string[],
  options?: { allowNonHttp?: boolean },
): void {
  try {
    const parsed = new URL(value);
    if (
      !options?.allowNonHttp &&
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      issues.push(`${key} must be an http/https URL.`);
    }
  } catch {
    issues.push(`${key} must be a valid URL.`);
  }
}

function requireCorsOrigins(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  issues: string[],
): void {
  const value = normalizeOptional(env.APP_CORS_ORIGINS);
  if (!value) {
    issues.push("APP_CORS_ORIGINS is required in production.");
    return;
  }

  const origins = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (origins.length === 0) {
    issues.push("APP_CORS_ORIGINS must contain at least one origin.");
    return;
  }

  for (const origin of origins) {
    validateUrlValue("APP_CORS_ORIGINS", origin, issues);
  }
}

function requireSecret(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
  minLength: number,
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    issues.push(`${key} is required in production.`);
    return;
  }

  if (isUnsafeSecretValue(value)) {
    issues.push(`${key} uses an unsafe default or placeholder value.`);
    return;
  }

  if (value.length < minLength) {
    issues.push(`${key} must be at least ${minLength} characters long.`);
  }
}

function requirePassword(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
  minLength: number,
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    issues.push(`${key} is required in production.`);
    return;
  }

  if (isUnsafeSecretValue(value)) {
    issues.push(`${key} uses an unsafe default or placeholder value.`);
    return;
  }

  if (value.length < minLength) {
    issues.push(`${key} must be at least ${minLength} characters long.`);
  }
}

function requireSecretLikeIfPresent(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  const value = normalizeOptional(env[key]);
  if (!value) {
    return;
  }

  if (isUnsafeSecretValue(value)) {
    issues.push(`${key} uses an unsafe default or placeholder value.`);
    return;
  }

  if (value.length < MIN_SECRET_LENGTH) {
    issues.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
}

function isUnsafeSecretValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (FORBIDDEN_SECRET_VALUES.has(normalized)) {
    return true;
  }

  return FORBIDDEN_SECRET_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

function rejectUnsafeIdentityValue(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  key: string,
  issues: string[],
): void {
  const value = normalizeOptional(env[key]).toLowerCase();
  if (!value) {
    return;
  }

  if (FORBIDDEN_PRODUCTION_IDENTITY_VALUES.has(value)) {
    issues.push(`${key} must not use a built-in development fallback value.`);
  }
}

function rejectUnsafeDatabaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  issues: string[],
): void {
  const value = normalizeOptional(env.DATABASE_URL).toLowerCase();
  if (!value) {
    return;
  }

  if (
    value.includes("user:password@") ||
    value.includes("replace-with-real") ||
    value.includes("localhost:") ||
    value.includes("127.0.0.1:") ||
    value.includes("://postgres:postgres@")
  ) {
    issues.push("DATABASE_URL must not use a local/default/placeholder production value.");
  }
}

function isLineLoginEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  return [
    "LINE_CHANNEL_ID",
    "LINE_LOGIN_CHANNEL_ID",
    "LINE_CHANNEL_SECRET",
    "LINE_LOGIN_CHANNEL_SECRET",
    "LINE_LOGIN_CALLBACK_URL",
    "LINE_LIFF_ID",
    "LINE_LIFF_SIGNIN_URL",
  ].some((key) => normalizeOptional(env[key]).length > 0);
}
