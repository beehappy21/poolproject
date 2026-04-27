import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CommissionSettings {
  directLevelRates: string[];
  uniLevelRates: string[];
  matchingLevelRates: string[];
  teamTwoLegRate: string;
  teamThreeLegRate: string;
  dailyCommissionCapAmount: string;
  buybackThresholdAmount: string;
  buybackRepurchaseAmount: string;
  buybackGraceDays: number;
  poolMinActivePackageBuyerDirects: number;
  poolMaxEntitlementShareRate: string;
  poolRate: string;
  cashbackRate: string;
  appVisibility: {
    cashback: boolean;
    direct: boolean;
    matching: boolean;
    team: boolean;
    unilevel: boolean;
    matrix: boolean;
    pool: boolean;
  };
}

const SETTINGS_PATH = join(
  process.cwd(),
  "runtime",
  "commission-settings.json",
);

const DEFAULT_SETTINGS: CommissionSettings = {
  directLevelRates: ["0.5", "0.5"],
  uniLevelRates: ["0"],
  matchingLevelRates: ["0.05", "0.05"],
  teamTwoLegRate: "0.3",
  teamThreeLegRate: "0.5",
  dailyCommissionCapAmount: "5000",
  buybackThresholdAmount: "10000",
  buybackRepurchaseAmount: "1000",
  buybackGraceDays: 3,
  poolMinActivePackageBuyerDirects: 3,
  poolMaxEntitlementShareRate: "0.03",
  poolRate: "1",
  cashbackRate: "0",
  appVisibility: {
    cashback: false,
    direct: true,
    matching: true,
    team: true,
    unilevel: false,
    matrix: false,
    pool: true,
  },
};

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim());
}

function normalizePositiveInt(
  value: unknown,
  fallback: number,
): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : fallback;
  }

  return fallback;
}

function normalizeRateArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => isDecimalString(item));

  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeUniLevelRates(value: unknown): string[] {
  return normalizeRateArray(value, DEFAULT_SETTINGS.uniLevelRates);
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

function normalizeMatchingLevelRates(value: unknown): string[] {
  return normalizeRateArray(value, DEFAULT_SETTINGS.matchingLevelRates);
}

function normalizeDecimalField(
  value: unknown,
  fallback: string,
): string {
  return isDecimalString(value) ? value.trim() : fallback;
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
    matchingLevelRates: normalizeMatchingLevelRates(candidate.matchingLevelRates),
    teamTwoLegRate: normalizeDecimalField(
      candidate.teamTwoLegRate,
      DEFAULT_SETTINGS.teamTwoLegRate,
    ),
    teamThreeLegRate: normalizeDecimalField(
      candidate.teamThreeLegRate,
      DEFAULT_SETTINGS.teamThreeLegRate,
    ),
    dailyCommissionCapAmount: normalizeDecimalField(
      candidate.dailyCommissionCapAmount ?? candidate.dailyCapAmount,
      DEFAULT_SETTINGS.dailyCommissionCapAmount,
    ),
    buybackThresholdAmount: normalizeDecimalField(
      candidate.buybackThresholdAmount ?? candidate.buybackThreshold,
      DEFAULT_SETTINGS.buybackThresholdAmount,
    ),
    buybackRepurchaseAmount: normalizeDecimalField(
      candidate.buybackRepurchaseAmount ?? candidate.buybackExecutionAmount,
      DEFAULT_SETTINGS.buybackRepurchaseAmount,
    ),
    buybackGraceDays: normalizePositiveInt(
      candidate.buybackGraceDays,
      DEFAULT_SETTINGS.buybackGraceDays,
    ),
    poolMinActivePackageBuyerDirects: normalizePositiveInt(
      candidate.poolMinActivePackageBuyerDirects ?? candidate.poolMinActiveDirects,
      DEFAULT_SETTINGS.poolMinActivePackageBuyerDirects,
    ),
    poolMaxEntitlementShareRate: normalizeDecimalField(
      candidate.poolMaxEntitlementShareRate ?? candidate.poolMaxShareRatePerEntitlement,
      DEFAULT_SETTINGS.poolMaxEntitlementShareRate,
    ),
    poolRate: normalizeDecimalField(candidate.poolRate, DEFAULT_SETTINGS.poolRate),
    cashbackRate: normalizeDecimalField(
      candidate.cashbackRate,
      DEFAULT_SETTINGS.cashbackRate,
    ),
    appVisibility: {
      cashback: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).cashback
          : candidate.cashbackVisible,
        DEFAULT_SETTINGS.appVisibility.cashback,
      ),
      direct: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).direct
          : candidate.directVisible,
        DEFAULT_SETTINGS.appVisibility.direct,
      ),
      matching: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).matching
          : candidate.matchingVisible,
        DEFAULT_SETTINGS.appVisibility.matching,
      ),
      team: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).team
          : candidate.teamVisible,
        DEFAULT_SETTINGS.appVisibility.team,
      ),
      unilevel: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).unilevel
          : candidate.unilevelVisible,
        DEFAULT_SETTINGS.appVisibility.unilevel,
      ),
      matrix: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).matrix
          : candidate.matrixVisible,
        DEFAULT_SETTINGS.appVisibility.matrix,
      ),
      pool: normalizeBoolean(
        candidate.appVisibility && typeof candidate.appVisibility === "object"
          ? (candidate.appVisibility as Record<string, unknown>).pool
          : candidate.poolVisible,
        DEFAULT_SETTINGS.appVisibility.pool,
      ),
    },
  };
}

export function getDefaultCommissionSettings(): CommissionSettings {
  return {
    directLevelRates: [...DEFAULT_SETTINGS.directLevelRates],
    uniLevelRates: [...DEFAULT_SETTINGS.uniLevelRates],
    matchingLevelRates: [...DEFAULT_SETTINGS.matchingLevelRates],
    teamTwoLegRate: DEFAULT_SETTINGS.teamTwoLegRate,
    teamThreeLegRate: DEFAULT_SETTINGS.teamThreeLegRate,
    dailyCommissionCapAmount: DEFAULT_SETTINGS.dailyCommissionCapAmount,
    buybackThresholdAmount: DEFAULT_SETTINGS.buybackThresholdAmount,
    buybackRepurchaseAmount: DEFAULT_SETTINGS.buybackRepurchaseAmount,
    buybackGraceDays: DEFAULT_SETTINGS.buybackGraceDays,
    poolMinActivePackageBuyerDirects:
      DEFAULT_SETTINGS.poolMinActivePackageBuyerDirects,
    poolMaxEntitlementShareRate:
      DEFAULT_SETTINGS.poolMaxEntitlementShareRate,
    poolRate: DEFAULT_SETTINGS.poolRate,
    cashbackRate: DEFAULT_SETTINGS.cashbackRate,
    appVisibility: {...DEFAULT_SETTINGS.appVisibility},
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
