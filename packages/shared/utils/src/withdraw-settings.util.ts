import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface WithdrawSettings {
  withdrawEnabled: boolean;
  withholdingTaxRate: string;
  autoSweepRate: string;
  feeFlatAmount: string;
  minimumWithdrawAmount: string;
}

const SETTINGS_PATH = join(process.cwd(), "runtime", "withdraw-settings.json");

const DEFAULT_SETTINGS: WithdrawSettings = {
  withdrawEnabled: true,
  withholdingTaxRate: "0.05",
  autoSweepRate: "0",
  feeFlatAmount: "0",
  minimumWithdrawAmount: "0",
};

function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim());
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return fallback;
}

export function normalizeWithdrawSettings(input: unknown): WithdrawSettings {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    withdrawEnabled: normalizeBoolean(
      candidate.withdrawEnabled,
      DEFAULT_SETTINGS.withdrawEnabled,
    ),
    withholdingTaxRate: isDecimalString(candidate.withholdingTaxRate)
      ? candidate.withholdingTaxRate.trim()
      : DEFAULT_SETTINGS.withholdingTaxRate,
    autoSweepRate: isDecimalString(candidate.autoSweepRate)
      ? candidate.autoSweepRate.trim()
      : DEFAULT_SETTINGS.autoSweepRate,
    feeFlatAmount: isDecimalString(candidate.feeFlatAmount)
      ? candidate.feeFlatAmount.trim()
      : DEFAULT_SETTINGS.feeFlatAmount,
    minimumWithdrawAmount: isDecimalString(candidate.minimumWithdrawAmount)
      ? candidate.minimumWithdrawAmount.trim()
      : DEFAULT_SETTINGS.minimumWithdrawAmount,
  };
}

export function getDefaultWithdrawSettings(): WithdrawSettings {
  return { ...DEFAULT_SETTINGS };
}

export function readWithdrawSettings(): WithdrawSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return normalizeWithdrawSettings(JSON.parse(raw));
  } catch {
    return getDefaultWithdrawSettings();
  }
}

export function writeWithdrawSettings(
  input: Partial<WithdrawSettings> | WithdrawSettings,
): WithdrawSettings {
  const normalized = normalizeWithdrawSettings(input);
  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
