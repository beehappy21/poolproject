import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ManualPaymentSettings {
  accountName: string;
  bankName: string;
  accountNumber: string;
  promptPayName: string;
  promptPayNumber: string;
  qrImageUrl: string;
  note: string;
}

const SETTINGS_PATH = join(process.cwd(), "runtime", "manual-payment-settings.json");

const DEFAULT_SETTINGS: ManualPaymentSettings = {
  accountName: "Stephub Co., Ltd.",
  bankName: "Kasikornbank",
  accountNumber: "123-4-56789-0",
  promptPayName: "Stephub Co., Ltd.",
  promptPayNumber: "0812345678",
  qrImageUrl: "",
  note: "กรุณาโอนตามยอดที่แสดงในคำสั่งซื้อ และอัปโหลดสลิปเพื่อรอตรวจสอบ",
};

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeManualPaymentSettings(
  input: unknown,
): ManualPaymentSettings {
  const candidate =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    accountName: normalizeText(candidate.accountName, DEFAULT_SETTINGS.accountName),
    bankName: normalizeText(candidate.bankName, DEFAULT_SETTINGS.bankName),
    accountNumber: normalizeText(
      candidate.accountNumber,
      DEFAULT_SETTINGS.accountNumber,
    ),
    promptPayName: normalizeText(
      candidate.promptPayName,
      DEFAULT_SETTINGS.promptPayName,
    ),
    promptPayNumber: normalizeText(
      candidate.promptPayNumber,
      DEFAULT_SETTINGS.promptPayNumber,
    ),
    qrImageUrl:
      typeof candidate.qrImageUrl === "string" ? candidate.qrImageUrl.trim() : "",
    note: normalizeText(candidate.note, DEFAULT_SETTINGS.note),
  };
}

export function getDefaultManualPaymentSettings(): ManualPaymentSettings {
  return { ...DEFAULT_SETTINGS };
}

export function readManualPaymentSettings(): ManualPaymentSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return normalizeManualPaymentSettings(JSON.parse(raw));
  } catch {
    return getDefaultManualPaymentSettings();
  }
}

export function writeManualPaymentSettings(
  input: Partial<ManualPaymentSettings> | ManualPaymentSettings,
): ManualPaymentSettings {
  const normalized = normalizeManualPaymentSettings(input);
  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
