import fs from "node:fs";
import path from "node:path";

const targets = [
  "deploy/compose/.env",
  "deploy/compose/api.env",
  "deploy/compose/bao.env",
  "deploy/compose/wap.env",
].map((target) => path.resolve(process.cwd(), target));

const placeholderPatterns = [
  "replace-with-real",
  "set-in-real-env-only",
  "smtp.example.com",
  "no-reply@example.com",
  "USER:PASSWORD",
  "REDIS_HOST",
];

let hasFailures = false;

for (const target of targets) {
  if (!fs.existsSync(target)) {
    process.stderr.write(`[secret-check] missing file: ${target}\n`);
    hasFailures = true;
    continue;
  }

  const content = fs.readFileSync(target, "utf8");
  const env = parseEnvFile(content);
  const matches = [];

  for (const pattern of placeholderPatterns) {
    if (Object.values(env).some((value) => value.includes(pattern))) {
      matches.push(pattern);
    }
  }

  if (matches.length > 0) {
    hasFailures = true;
    process.stderr.write(`[secret-check] ${target}\n`);
    for (const match of matches) {
      process.stderr.write(`ERROR: found placeholder pattern: ${match}\n`);
    }
  } else {
    process.stdout.write(`[secret-check] OK: ${target}\n`);
  }
}

if (hasFailures) {
  process.exit(1);
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
