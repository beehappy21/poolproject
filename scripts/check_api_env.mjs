import fs from "node:fs";
import path from "node:path";

const targetArg = process.argv[2] || ".env.staging.example";
const targetPath = path.resolve(process.cwd(), targetArg);

if (!fs.existsSync(targetPath)) {
  process.stderr.write(`[env-check] file not found: ${targetPath}\n`);
  process.exit(1);
}

const content = fs.readFileSync(targetPath, "utf8");
const env = parseEnvFile(content);
const errors = [];
const warnings = [];
const isExampleFile = targetPath.endsWith(".example");

const requiredKeys = [
  "DATABASE_URL",
  "APP_PORT",
  "APP_WAP_URL",
  "APP_PUBLIC_BASE_URL",
  "APP_CORS_ORIGINS",
  "APP_BODY_LIMIT",
  "APP_TRUST_PROXY_HOPS",
  "APP_RATE_LIMIT_WINDOW_MS",
  "APP_RATE_LIMIT_MAX_REQUESTS",
  "LINE_CHANNEL_ID",
  "LINE_LOGIN_CHANNEL_ID",
  "LINE_LOGIN_CHANNEL_SECRET",
  "LINE_LOGIN_CALLBACK_URL",
  "LINE_LIFF_ID",
  "LINE_LIFF_SIGNIN_URL",
  "LINE_STRICT_VERIFY",
];

for (const key of requiredKeys) {
  if (!env[key]?.trim()) {
    errors.push(`missing required key: ${key}`);
  }
}

checkUrl(env, "APP_WAP_URL", errors);
checkUrl(env, "APP_PUBLIC_BASE_URL", errors);
checkUrl(env, "LINE_LOGIN_CALLBACK_URL", errors);
checkUrl(env, "LINE_LIFF_SIGNIN_URL", errors);

const corsOrigins = env.APP_CORS_ORIGINS
  ? env.APP_CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
  : [];

if (corsOrigins.length === 0) {
  errors.push("APP_CORS_ORIGINS must contain at least one origin");
}

if (env.APP_WAP_URL && !corsOrigins.includes(env.APP_WAP_URL)) {
  warnings.push("APP_CORS_ORIGINS does not include APP_WAP_URL");
}

if (env.APP_PUBLIC_BASE_URL && !corsOrigins.includes(env.APP_PUBLIC_BASE_URL)) {
  warnings.push("APP_CORS_ORIGINS does not include APP_PUBLIC_BASE_URL");
}

checkPositiveInt(env, "APP_PORT", errors);
checkPositiveInt(env, "APP_TRUST_PROXY_HOPS", errors);
checkPositiveInt(env, "APP_RATE_LIMIT_WINDOW_MS", errors);
checkPositiveInt(env, "APP_RATE_LIMIT_MAX_REQUESTS", errors);

if (env.LINE_STRICT_VERIFY && !["true", "false"].includes(env.LINE_STRICT_VERIFY)) {
  errors.push("LINE_STRICT_VERIFY must be true or false");
}

if (
  env.LINE_LOGIN_CALLBACK_URL &&
  env.LINE_LIFF_SIGNIN_URL &&
  env.LINE_LOGIN_CALLBACK_URL !== env.LINE_LIFF_SIGNIN_URL
) {
  warnings.push("LINE_LOGIN_CALLBACK_URL and LINE_LIFF_SIGNIN_URL differ");
}

if (env.APP_REDIS_URL && !looksLikeRedisUrl(env.APP_REDIS_URL)) {
  errors.push("APP_REDIS_URL must start with redis:// or rediss://");
}

if (env.DATABASE_URL && !env.DATABASE_URL.startsWith("postgresql://")) {
  warnings.push("DATABASE_URL does not start with postgresql://");
}

if (!isExampleFile) {
  checkPlaceholderValue(env, "DATABASE_URL", warnings);
  checkPlaceholderValue(env, "LINE_LOGIN_CHANNEL_SECRET", errors);
  checkPlaceholderValue(env, "APP_REDIS_URL", warnings);
}

if (errors.length > 0) {
  process.stderr.write(`[env-check] ${targetPath}\n`);
  for (const error of errors) {
    process.stderr.write(`ERROR: ${error}\n`);
  }
  for (const warning of warnings) {
    process.stderr.write(`WARN: ${warning}\n`);
  }
  process.exit(1);
}

process.stdout.write(`[env-check] ${targetPath}\n`);
process.stdout.write("OK: required API env keys are present\n");
for (const warning of warnings) {
  process.stdout.write(`WARN: ${warning}\n`);
}

function parseEnvFile(source) {
  const result = {};

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

function stripWrappingQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function checkPositiveInt(envMap, key, errorsList) {
  const value = envMap[key];
  if (!value) {
    return;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    errorsList.push(`${key} must be a positive integer`);
  }
}

function checkUrl(envMap, key, errorsList) {
  const value = envMap[key];
  if (!value) {
    return;
  }

  try {
    const parsed = new URL(value);
    if (!parsed.protocol.startsWith("http")) {
      errorsList.push(`${key} must be an http/https URL`);
    }
  } catch {
    errorsList.push(`${key} must be a valid URL`);
  }
}

function looksLikeRedisUrl(value) {
  return value.startsWith("redis://") || value.startsWith("rediss://");
}

function checkPlaceholderValue(envMap, key, list) {
  const value = envMap[key];
  if (!value) {
    return;
  }

  if (
    value.includes("replace-with-real") ||
    value.includes("set-in-real-env-only") ||
    value.includes("USER:PASSWORD") ||
    value.includes("REDIS_HOST")
  ) {
    list.push(`${key} still looks like a placeholder value`);
  }
}
