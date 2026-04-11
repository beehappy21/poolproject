import fs from "node:fs";
import path from "node:path";

const targetArg = process.argv[2] || "deploy/compose/bao.env.example";
const targetPath = path.resolve(process.cwd(), targetArg);

if (!fs.existsSync(targetPath)) {
  process.stderr.write(`[bao-env-check] file not found: ${targetPath}\n`);
  process.exit(1);
}

const content = fs.readFileSync(targetPath, "utf8");
const env = parseEnvFile(content);
const errors = [];
const warnings = [];
const isExampleFile = targetPath.endsWith(".example");

const requiredKeys = [
  "APP_NAME",
  "APP_ENV",
  "APP_KEY",
  "APP_DEBUG",
  "APP_URL",
  "APP_WAP_URL",
  "APP_API_URL",
  "LOG_LEVEL",
  "SESSION_DRIVER",
  "SESSION_LIFETIME",
  "POOL_DB_HOST",
  "POOL_DB_PORT",
  "POOL_DB_DATABASE",
  "POOL_DB_USERNAME",
  "POOL_DB_PASSWORD",
  "REDIS_HOST",
  "REDIS_PORT",
  "BAO_UPLOAD_MAX_FILESIZE",
  "BAO_POST_MAX_SIZE",
  "BAO_MAX_FILE_UPLOADS",
  "MAIL_MAILER",
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USERNAME",
  "MAIL_PASSWORD",
  "MAIL_FROM_ADDRESS",
  "LINE_LIFF_ID",
  "LINE_LOGIN_CALLBACK_URL",
  "LINE_LIFF_SIGNIN_URL",
  "LINE_STRICT_VERIFY",
];

for (const key of requiredKeys) {
  if (!env[key]?.trim()) {
    errors.push(`missing required key: ${key}`);
  }
}

checkUrl(env, "APP_URL", errors);
checkUrl(env, "APP_WAP_URL", errors);
checkUrl(env, "APP_API_URL", errors);
checkUrl(env, "LINE_LOGIN_CALLBACK_URL", errors);
checkUrl(env, "LINE_LIFF_SIGNIN_URL", errors);

checkPositiveInt(env, "POOL_DB_PORT", errors);
checkPositiveInt(env, "REDIS_PORT", errors);
checkPositiveInt(env, "MAIL_PORT", errors);
checkPositiveInt(env, "SESSION_LIFETIME", errors);
checkPositiveInt(env, "BAO_MAX_FILE_UPLOADS", errors);

if (env.LINE_STRICT_VERIFY && !["true", "false"].includes(env.LINE_STRICT_VERIFY)) {
  errors.push("LINE_STRICT_VERIFY must be true or false");
}

if (env.APP_DEBUG && !["true", "false"].includes(env.APP_DEBUG)) {
  errors.push("APP_DEBUG must be true or false");
}

if (
  env.LINE_LOGIN_CALLBACK_URL &&
  env.LINE_LIFF_SIGNIN_URL &&
  env.LINE_LOGIN_CALLBACK_URL !== env.LINE_LIFF_SIGNIN_URL
) {
  warnings.push("LINE_LOGIN_CALLBACK_URL and LINE_LIFF_SIGNIN_URL differ");
}

if (env.APP_WAP_URL && env.LINE_LOGIN_CALLBACK_URL && !env.LINE_LOGIN_CALLBACK_URL.startsWith(env.APP_WAP_URL)) {
  warnings.push("LINE_LOGIN_CALLBACK_URL does not start with APP_WAP_URL");
}

if (env.APP_WAP_URL && env.LINE_LIFF_SIGNIN_URL && !env.LINE_LIFF_SIGNIN_URL.startsWith(env.APP_WAP_URL)) {
  warnings.push("LINE_LIFF_SIGNIN_URL does not start with APP_WAP_URL");
}

if (env.APP_KEY && !env.APP_KEY.startsWith("base64:")) {
  warnings.push("APP_KEY does not start with base64:");
}

if (!isExampleFile) {
  checkPlaceholderValue(env, "APP_KEY", errors);
  checkPlaceholderValue(env, "POOL_DB_PASSWORD", errors);
  checkPlaceholderValue(env, "MAIL_USERNAME", warnings);
  checkPlaceholderValue(env, "MAIL_PASSWORD", warnings);
}

finish("bao-env-check", targetPath, errors, warnings);

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

function finish(label, target, errorsList, warningsList) {
  if (errorsList.length > 0) {
    process.stderr.write(`[${label}] ${target}\n`);
    for (const error of errorsList) {
      process.stderr.write(`ERROR: ${error}\n`);
    }
    for (const warning of warningsList) {
      process.stderr.write(`WARN: ${warning}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`[${label}] ${target}\n`);
  process.stdout.write("OK: required BAO env keys are present\n");
  for (const warning of warningsList) {
    process.stdout.write(`WARN: ${warning}\n`);
  }
}

function checkPlaceholderValue(envMap, key, list) {
  const value = envMap[key];
  if (!value) {
    return;
  }

  if (
    value.includes("replace-with-real") ||
    value.includes("smtp.example.com") ||
    value.includes("no-reply@example.com")
  ) {
    list.push(`${key} still looks like a placeholder value`);
  }
}
