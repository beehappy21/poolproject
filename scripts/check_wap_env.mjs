import fs from "node:fs";
import path from "node:path";

const targetArg = process.argv[2] || "deploy/compose/wap.env.example";
const targetPath = path.resolve(process.cwd(), targetArg);

if (!fs.existsSync(targetPath)) {
  process.stderr.write(`[wap-env-check] file not found: ${targetPath}\n`);
  process.exit(1);
}

const content = fs.readFileSync(targetPath, "utf8");
const env = parseEnvFile(content);
const errors = [];
const warnings = [];
const isExampleFile = targetPath.endsWith(".example");

const requiredKeys = [
  "HOST",
  "PORT",
  "STEPHUB_API_PROXY_TARGET",
  "STEPHUB_BAO_PROXY_TARGET",
];

for (const key of requiredKeys) {
  if (!env[key]?.trim()) {
    errors.push(`missing required key: ${key}`);
  }
}

checkPositiveInt(env, "PORT", errors);
checkUrl(env, "STEPHUB_API_PROXY_TARGET", errors);
checkUrl(env, "STEPHUB_BAO_PROXY_TARGET", errors);

if (env.HOST !== "0.0.0.0") {
  warnings.push("HOST is not 0.0.0.0");
}

if (!isExampleFile) {
  checkPlaceholderValue(env, "STEPHUB_API_PROXY_TARGET", warnings);
  checkPlaceholderValue(env, "STEPHUB_BAO_PROXY_TARGET", warnings);
}

finish("wap-env-check", targetPath, errors, warnings);

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
  process.stdout.write("OK: required WAP env keys are present\n");
  for (const warning of warningsList) {
    process.stdout.write(`WARN: ${warning}\n`);
  }
}

function checkPlaceholderValue(envMap, key, list) {
  const value = envMap[key];
  if (!value) {
    return;
  }

  if (value.includes("example.com")) {
    list.push(`${key} still looks like a placeholder value`);
  }
}
