import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface MatrixSettings {
  boardWidth: number;
  boardDepth: number;
  boardDepths: number[];
  boardCount: number;
  organizationPvRate: string;
  cwReentryAmount: string;
  reentryFirmAmount: string;
  reentryPvAmount: string;
  levelRates: string[];
  boardLevelRates: string[][];
  boardOpenPvThresholds: string[];
}

const SETTINGS_PATH = join(process.cwd(), "runtime", "matrix-settings.json");

const DEFAULT_SETTINGS: MatrixSettings = {
  boardWidth: 2,
  boardDepth: 3,
  boardDepths: [3, 2, 2],
  boardCount: 3,
  organizationPvRate: "700",
  cwReentryAmount: "700",
  reentryFirmAmount: "700",
  reentryPvAmount: "700",
  levelRates: ["0.15", "0.15", "0.15"],
  boardLevelRates: [
    ["0.15", "0.15", "0.15"],
    ["0.1", "0.1"],
    ["0.2", "0.2"],
  ],
  boardOpenPvThresholds: ["700", "700", "700"],
};

function normalizeBoardLevelRates(
  value: unknown,
  boardDepths: number[],
  fallbackRates: string[],
): string[][] {
  if (!Array.isArray(value)) {
    return boardDepths.map((depth, index) => {
      const defaultRow = DEFAULT_SETTINGS.boardLevelRates[index] ?? fallbackRates.slice(0, depth);
      return [...defaultRow];
    });
  }

  const normalizedBoards = value.map((boardRates, index) =>
    normalizeDecimalArray(
      boardRates,
      DEFAULT_SETTINGS.boardLevelRates[index] ?? fallbackRates.slice(0, boardDepths[index] ?? 0),
      boardDepths[index],
    ),
  );

  if (normalizedBoards.length !== boardDepths.length) {
    return boardDepths.map((depth, index) => {
      const defaultRow = DEFAULT_SETTINGS.boardLevelRates[index] ?? fallbackRates.slice(0, depth);
      return [...defaultRow];
    });
  }

  return normalizedBoards;
}

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

function normalizePositiveIntegerArray(
  value: unknown,
  fallback: number[],
  expectedLength?: number,
): number[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value.filter(
    (item): item is number =>
      typeof item === "number" &&
      Number.isInteger(item) &&
      !Number.isNaN(item) &&
      item > 0,
  );

  if (expectedLength && normalized.length !== expectedLength) {
    return [...fallback];
  }

  return normalized.length > 0 ? normalized : [...fallback];
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
  const boardDepths = normalizePositiveIntegerArray(
    candidate.boardDepths,
    DEFAULT_SETTINGS.boardDepths,
    boardCount,
  );

  return {
    boardWidth: normalizePositiveInteger(
      candidate.boardWidth,
      DEFAULT_SETTINGS.boardWidth,
    ),
    boardDepth,
    boardDepths,
    boardCount,
    organizationPvRate: isNonNegativeDecimalString(candidate.organizationPvRate)
      ? candidate.organizationPvRate.trim()
      : DEFAULT_SETTINGS.organizationPvRate,
    cwReentryAmount: isNonNegativeDecimalString(candidate.cwReentryAmount)
      ? candidate.cwReentryAmount.trim()
      : isNonNegativeDecimalString(candidate.organizationPvRate)
        ? candidate.organizationPvRate.trim()
        : DEFAULT_SETTINGS.cwReentryAmount,
    reentryFirmAmount: isNonNegativeDecimalString(candidate.reentryFirmAmount)
      ? candidate.reentryFirmAmount.trim()
      : isNonNegativeDecimalString(candidate.cwReentryAmount)
        ? candidate.cwReentryAmount.trim()
        : isNonNegativeDecimalString(candidate.organizationPvRate)
          ? candidate.organizationPvRate.trim()
          : DEFAULT_SETTINGS.reentryFirmAmount,
    reentryPvAmount: isNonNegativeDecimalString(candidate.reentryPvAmount)
      ? candidate.reentryPvAmount.trim()
      : isNonNegativeDecimalString(candidate.organizationPvRate)
        ? candidate.organizationPvRate.trim()
        : DEFAULT_SETTINGS.reentryPvAmount,
    levelRates: normalizeDecimalArray(
      candidate.levelRates,
      DEFAULT_SETTINGS.levelRates,
      boardDepth,
    ),
    boardLevelRates: normalizeBoardLevelRates(
      candidate.boardLevelRates,
      boardDepths,
      normalizeDecimalArray(
        candidate.levelRates,
        DEFAULT_SETTINGS.levelRates,
        boardDepth,
      ),
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
    boardDepths: [...DEFAULT_SETTINGS.boardDepths],
    boardCount: DEFAULT_SETTINGS.boardCount,
    organizationPvRate: DEFAULT_SETTINGS.organizationPvRate,
    cwReentryAmount: DEFAULT_SETTINGS.cwReentryAmount,
    reentryFirmAmount: DEFAULT_SETTINGS.reentryFirmAmount,
    reentryPvAmount: DEFAULT_SETTINGS.reentryPvAmount,
    levelRates: [...DEFAULT_SETTINGS.levelRates],
    boardLevelRates: DEFAULT_SETTINGS.boardLevelRates.map((rates) => [...rates]),
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
