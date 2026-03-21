import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface MatrixSettings {
  boardWidth: number;
  boardDepth: number;
  boardCount: number;
  organizationPvRate: string;
  levelRates: string[];
  boardOpenPvThresholds: string[];
}

const SETTINGS_PATH = join(process.cwd(), "runtime", "matrix-settings.json");

const DEFAULT_SETTINGS: MatrixSettings = {
  boardWidth: 2,
  boardDepth: 3,
  boardCount: 3,
  organizationPvRate: "0.1",
  levelRates: ["0.1", "0.05", "0.03"],
  boardOpenPvThresholds: ["100", "100", "100"],
};

function isNonNegativeDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim());
}

function normalizeDecimalArray(
  value: unknown,
  fallback: string[],
  expectedLength?: number,
): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => isNonNegativeDecimalString(item));

  if (expectedLength && normalized.length !== expectedLength) {
    return [...fallback];
  }

  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Number.isNaN(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

export function normalizeMatrixSettings(input: unknown): MatrixSettings {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const boardDepth = normalizePositiveInteger(
    candidate.boardDepth,
    DEFAULT_SETTINGS.boardDepth,
  );
  const boardCount = normalizePositiveInteger(
    candidate.boardCount,
    DEFAULT_SETTINGS.boardCount,
  );

  return {
    boardWidth: normalizePositiveInteger(
      candidate.boardWidth,
      DEFAULT_SETTINGS.boardWidth,
    ),
    boardDepth,
    boardCount,
    organizationPvRate: isNonNegativeDecimalString(candidate.organizationPvRate)
      ? candidate.organizationPvRate.trim()
      : DEFAULT_SETTINGS.organizationPvRate,
    levelRates: normalizeDecimalArray(
      candidate.levelRates,
      DEFAULT_SETTINGS.levelRates,
      boardDepth,
    ),
    boardOpenPvThresholds: normalizeDecimalArray(
      candidate.boardOpenPvThresholds,
      DEFAULT_SETTINGS.boardOpenPvThresholds,
      boardCount,
    ),
  };
}

export function getDefaultMatrixSettings(): MatrixSettings {
  return {
    boardWidth: DEFAULT_SETTINGS.boardWidth,
    boardDepth: DEFAULT_SETTINGS.boardDepth,
    boardCount: DEFAULT_SETTINGS.boardCount,
    organizationPvRate: DEFAULT_SETTINGS.organizationPvRate,
    levelRates: [...DEFAULT_SETTINGS.levelRates],
    boardOpenPvThresholds: [...DEFAULT_SETTINGS.boardOpenPvThresholds],
  };
}

export function readMatrixSettings(): MatrixSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return normalizeMatrixSettings(JSON.parse(raw));
  } catch {
    return getDefaultMatrixSettings();
  }
}

export function parseMatrixSettingsSnapshot(
  snapshot: string | null | undefined,
): MatrixSettings {
  if (!snapshot) {
    return getDefaultMatrixSettings();
  }

  try {
    return normalizeMatrixSettings(JSON.parse(snapshot));
  } catch {
    return getDefaultMatrixSettings();
  }
}

export function serializeMatrixSettingsSnapshot(input: MatrixSettings): string {
  return JSON.stringify(normalizeMatrixSettings(input));
}

export function writeMatrixSettings(input: MatrixSettings): MatrixSettings {
  const normalized = normalizeMatrixSettings(input);

  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}
