import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CommissionSettings {
  directLevelRates: string[];
  uniLevelRates: string[];
  poolRate: string;
  cashbackRate: string;
}

const SETTINGS_PATH = join(
  process.cwd(),
  "runtime",
  "commission-settings.json",
);

const DEFAULT_SETTINGS: CommissionSettings = {
  directLevelRates: ["0.2"],
  uniLevelRates: ["0.05", "0.05", "0.05", "0.05", "0.05"],
  poolRate: "0.5",
  cashbackRate: "0",
};

function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim());
}

function normalizeUniLevelRates(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return DEFAULT_SETTINGS.uniLevelRates;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => isDecimalString(item));

  return normalized.length > 0 ? normalized : DEFAULT_SETTINGS.uniLevelRates;
}

function normalizeDirectLevelRates(value: unknown, legacyRate: unknown): string[] {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => isDecimalString(item));

    if (normalized.length > 0) {
      return normalized;
    }
  }

  if (isDecimalString(legacyRate)) {
    return [legacyRate.trim()];
  }

  return DEFAULT_SETTINGS.directLevelRates;
}

export function normalizeCommissionSettings(input: unknown): CommissionSettings {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    directLevelRates: normalizeDirectLevelRates(
      candidate.directLevelRates,
      candidate.directRate,
    ),
    uniLevelRates: normalizeUniLevelRates(candidate.uniLevelRates),
    poolRate: isDecimalString(candidate.poolRate)
      ? candidate.poolRate.trim()
      : DEFAULT_SETTINGS.poolRate,
    cashbackRate: isDecimalString(candidate.cashbackRate)
      ? candidate.cashbackRate.trim()
      : DEFAULT_SETTINGS.cashbackRate,
  };
}

export function getDefaultCommissionSettings(): CommissionSettings {
  return {
    directLevelRates: [...DEFAULT_SETTINGS.directLevelRates],
    uniLevelRates: [...DEFAULT_SETTINGS.uniLevelRates],
    poolRate: DEFAULT_SETTINGS.poolRate,
    cashbackRate: DEFAULT_SETTINGS.cashbackRate,
  };
}

export function readCommissionSettings(): CommissionSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return normalizeCommissionSettings(JSON.parse(raw));
  } catch {
    return getDefaultCommissionSettings();
  }
}

export function parseCommissionSettingsSnapshot(
  snapshot: string | null | undefined,
): CommissionSettings {
  if (!snapshot) {
    return getDefaultCommissionSettings();
  }

  try {
    return normalizeCommissionSettings(JSON.parse(snapshot));
  } catch {
    return getDefaultCommissionSettings();
  }
}

export function serializeCommissionSettingsSnapshot(
  input: CommissionSettings,
): string {
  return JSON.stringify(normalizeCommissionSettings(input));
}

export function writeCommissionSettings(
  input: CommissionSettings,
): CommissionSettings {
  const normalized = normalizeCommissionSettings(input);

  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(`${SETTINGS_PATH}`, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}
