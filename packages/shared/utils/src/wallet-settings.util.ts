import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface WalletSettings {
  firmEnabled: boolean;
  autoBuybackEnabled: boolean;
  commissionToShoppingEnabled: boolean;
  commissionToShoppingFeeRate: string;
  walletTransferEnabled: boolean;
  walletTransferFeeRate: string;
  walletTopupEnabled: boolean;
  shoppingWalletSpendEnabled: boolean;
  discountWalletSpendEnabled: boolean;
  orderCashPaymentMethods: string[];
  walletTopupPaymentMethods: string[];
}

const SETTINGS_PATH = join(process.cwd(), "runtime", "wallet-settings.json");

const DEFAULT_SETTINGS: WalletSettings = {
  firmEnabled: false,
  autoBuybackEnabled: false,
  commissionToShoppingEnabled: true,
  commissionToShoppingFeeRate: "0.05",
  walletTransferEnabled: true,
  walletTransferFeeRate: "0",
  walletTopupEnabled: true,
  shoppingWalletSpendEnabled: true,
  discountWalletSpendEnabled: true,
  orderCashPaymentMethods: ["bank_transfer", "promptpay_qr", "cash"],
  walletTopupPaymentMethods: ["manual_bank", "promptpay_qr", "cash"],
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

function normalizePaymentMethods(
  value: unknown,
  fallback: string[],
  fieldName: string,
): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0 && /^[a-z0-9_]+$/.test(item));

  if (normalized.length === 0) {
    return [...fallback];
  }

  return Array.from(new Set(normalized)).slice(0, fieldName === "orderCashPaymentMethods" ? 10 : 10);
}

export function normalizeWalletSettings(input: unknown): WalletSettings {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    firmEnabled: normalizeBoolean(
      candidate.firmEnabled ?? candidate.firm_enabled,
      DEFAULT_SETTINGS.firmEnabled,
    ),
    autoBuybackEnabled: normalizeBoolean(
      candidate.autoBuybackEnabled ?? candidate.auto_buyback_enabled,
      DEFAULT_SETTINGS.autoBuybackEnabled,
    ),
    commissionToShoppingEnabled: normalizeBoolean(
      candidate.commissionToShoppingEnabled,
      DEFAULT_SETTINGS.commissionToShoppingEnabled,
    ),
    commissionToShoppingFeeRate: isDecimalString(
      candidate.commissionToShoppingFeeRate,
    )
      ? candidate.commissionToShoppingFeeRate.trim()
      : DEFAULT_SETTINGS.commissionToShoppingFeeRate,
    walletTransferEnabled: normalizeBoolean(
      candidate.walletTransferEnabled,
      DEFAULT_SETTINGS.walletTransferEnabled,
    ),
    walletTransferFeeRate: isDecimalString(candidate.walletTransferFeeRate)
      ? candidate.walletTransferFeeRate.trim()
      : DEFAULT_SETTINGS.walletTransferFeeRate,
    walletTopupEnabled: normalizeBoolean(
      candidate.walletTopupEnabled,
      DEFAULT_SETTINGS.walletTopupEnabled,
    ),
    shoppingWalletSpendEnabled: normalizeBoolean(
      candidate.shoppingWalletSpendEnabled,
      DEFAULT_SETTINGS.shoppingWalletSpendEnabled,
    ),
    discountWalletSpendEnabled: normalizeBoolean(
      candidate.discountWalletSpendEnabled,
      DEFAULT_SETTINGS.discountWalletSpendEnabled,
    ),
    orderCashPaymentMethods: normalizePaymentMethods(
      candidate.orderCashPaymentMethods,
      DEFAULT_SETTINGS.orderCashPaymentMethods,
      "orderCashPaymentMethods",
    ),
    walletTopupPaymentMethods: normalizePaymentMethods(
      candidate.walletTopupPaymentMethods,
      DEFAULT_SETTINGS.walletTopupPaymentMethods,
      "walletTopupPaymentMethods",
    ),
  };
}

export function getDefaultWalletSettings(): WalletSettings {
  return { ...DEFAULT_SETTINGS };
}

export function readWalletSettings(): WalletSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return normalizeWalletSettings(JSON.parse(raw));
  } catch {
    return getDefaultWalletSettings();
  }
}

export function writeWalletSettings(
  input: Partial<WalletSettings> | WalletSettings,
): WalletSettings {
  const normalized = normalizeWalletSettings(input);
  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(`${SETTINGS_PATH}`, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
