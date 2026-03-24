import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface SignupShareSettings {
  shareMessage: string;
}

const SETTINGS_PATH = join(process.cwd(), "runtime", "signup-share-settings.json");

const DEFAULT_SETTINGS: SignupShareSettings = {
  shareMessage:
    "ส่งข้อมูลนี้เก็บไว้สำหรับเข้าใช้งานครั้งแรก และเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบทันที",
};

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

  return {
    shareMessage: normalizeText(candidate.shareMessage, DEFAULT_SETTINGS.shareMessage),
  };
}

export function getDefaultSignupShareSettings(): SignupShareSettings {
  return {
    shareMessage: DEFAULT_SETTINGS.shareMessage,
  };
}

export function readSignupShareSettings(): SignupShareSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return normalizeSignupShareSettings(JSON.parse(raw));
  } catch {
    return getDefaultSignupShareSettings();
  }
}

export function writeSignupShareSettings(
  input: SignupShareSettings,
): SignupShareSettings {
  const normalized = normalizeSignupShareSettings(input);

  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(`${SETTINGS_PATH}`, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}
