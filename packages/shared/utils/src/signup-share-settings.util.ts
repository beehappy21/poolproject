import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface SignupShareSettings {
  shareLinkMessage: string;
  signupSuccessMessage: string;
}

const RUNTIME_ROOT_ENV_VARS = ["POOLPROJECT_RUNTIME_ROOT", "RUNTIME_ROOT"] as const;

const DEFAULT_SETTINGS: SignupShareSettings = {
  shareLinkMessage: "สมัครผ่านลิงก์แนะนำนี้ได้เลย",
  signupSuccessMessage:
    "ส่งข้อมูลนี้เก็บไว้สำหรับเข้าใช้งานครั้งแรก และเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบทันที",
};

function resolveRuntimeRoot(): string {
  for (const envKey of RUNTIME_ROOT_ENV_VARS) {
    const configuredRoot = process.env[envKey]?.trim();
    if (configuredRoot) {
      return resolve(configuredRoot);
    }
  }

  const searchRoots = [process.cwd(), __dirname];

  for (const startPath of searchRoots) {
    let current = resolve(startPath);

    while (true) {
      const runtimeDir = join(current, "runtime");
      const packageJson = join(current, "package.json");

      if (existsSync(runtimeDir) && existsSync(packageJson)) {
        return runtimeDir;
      }

      const parent = dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  return join(process.cwd(), "runtime");
}

function getSettingsPath(): string {
  return join(resolveRuntimeRoot(), "signup-share-settings.json");
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized !== "" ? normalized : fallback;
}

export function normalizeSignupShareSettings(input: unknown): SignupShareSettings {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const legacyShareMessage = normalizeText(
    candidate.shareMessage,
    DEFAULT_SETTINGS.signupSuccessMessage,
  );

  return {
    shareLinkMessage: normalizeText(
      candidate.shareLinkMessage,
      DEFAULT_SETTINGS.shareLinkMessage,
    ),
    signupSuccessMessage: normalizeText(
      candidate.signupSuccessMessage,
      legacyShareMessage,
    ),
  };
}

export function getDefaultSignupShareSettings(): SignupShareSettings {
  return {
    shareLinkMessage: DEFAULT_SETTINGS.shareLinkMessage,
    signupSuccessMessage: DEFAULT_SETTINGS.signupSuccessMessage,
  };
}

export function readSignupShareSettings(): SignupShareSettings {
  try {
    const raw = readFileSync(getSettingsPath(), "utf8");
    return normalizeSignupShareSettings(JSON.parse(raw));
  } catch {
    return getDefaultSignupShareSettings();
  }
}

export function writeSignupShareSettings(
  input: SignupShareSettings,
): SignupShareSettings {
  const normalized = normalizeSignupShareSettings(input);
  const runtimeRoot = resolveRuntimeRoot();
  const settingsPath = getSettingsPath();

  mkdirSync(runtimeRoot, { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}
