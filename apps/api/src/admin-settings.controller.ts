import { Body, Controller, Get, Put } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";

import {
  optionalString,
  requireDecimalRateString,
} from "./http/request.util";
import {
  readCommissionSettings,
  writeCommissionSettings,
} from "../../../packages/shared/utils/src/commission-settings.util";
import {
  readWalletSettings,
  writeWalletSettings,
} from "../../../packages/shared/utils/src/wallet-settings.util";
import {
  readManualPaymentSettings,
  writeManualPaymentSettings,
} from "../../../packages/shared/utils/src/manual-payment-settings.util";
import {
  readSignupShareSettings,
  writeSignupShareSettings,
} from "../../../packages/shared/utils/src/signup-share-settings.util";

const MAX_DIRECT_LEVELS = 10;
const MAX_UNI_LEVELS = 20;

const normalizeEnvValue = (value?: string | null): string => value?.trim() || "";

const extractHost = (value: string): string => {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).host;
  } catch {
    return "";
  }
};

const buildPublicPathUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl) {
    return "";
  }

  try {
    const parsed = new URL(baseUrl);
    parsed.pathname = path;
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const readLineRuntimeSettings = () => {
  const lineLoginChannelId =
    normalizeEnvValue(process.env.LINE_LOGIN_CHANNEL_ID) ||
    normalizeEnvValue(process.env.LINE_CHANNEL_ID);
  const callbackUrl = normalizeEnvValue(process.env.LINE_LOGIN_CALLBACK_URL);
  const liffId = normalizeEnvValue(process.env.LINE_LIFF_ID);
  const liffSignInUrl = normalizeEnvValue(process.env.LINE_LIFF_SIGNIN_URL);
  const wapBaseUrl = normalizeEnvValue(process.env.APP_WAP_URL);
  const strictVerificationEnabled =
    process.env.LINE_STRICT_VERIFY === "true" || process.env.NODE_ENV === "production";
  const callbackHost = extractHost(callbackUrl);
  const liffSigninHost = extractHost(liffSignInUrl);
  const wapBaseHost = extractHost(wapBaseUrl);
  const richMenuShareUrl = buildPublicPathUrl(
    wapBaseUrl || liffSignInUrl || callbackUrl,
    "/line/liff/signin/share",
  );
  const richMenuShareHost = extractHost(richMenuShareUrl);
  const publicLineHostAligned =
    Boolean(callbackHost) &&
    Boolean(liffSigninHost) &&
    callbackHost === "wap.blifehealthy.com" &&
    liffSigninHost === "wap.blifehealthy.com";

  return {
    environment: process.env.NODE_ENV || "development",
    lineLoginChannelId,
    lineLoginChannelIdConfigured: Boolean(lineLoginChannelId),
    lineLoginChannelSecretConfigured: Boolean(
      normalizeEnvValue(process.env.LINE_LOGIN_CHANNEL_SECRET) ||
        normalizeEnvValue(process.env.LINE_CHANNEL_SECRET),
    ),
    lineLoginCallbackUrl: callbackUrl,
    lineLoginCallbackConfigured: Boolean(callbackUrl),
    lineLoginCallbackHost: callbackHost,
    lineLiffId: liffId,
    lineLiffIdConfigured: Boolean(liffId),
    lineLiffSignInUrl: liffSignInUrl,
    lineLiffSignInConfigured: Boolean(liffSignInUrl),
    lineLiffSignInHost: liffSigninHost,
    wapBaseUrl,
    wapBaseConfigured: Boolean(wapBaseUrl),
    wapBaseHost,
    richMenuShareUrl,
    richMenuShareConfigured: Boolean(richMenuShareUrl),
    richMenuShareHost,
    publicLineHostAligned,
    strictVerificationEnabled,
    apiBaseUrl:
      normalizeEnvValue(process.env.APP_PUBLIC_BASE_URL) ||
      normalizeEnvValue(process.env.APP_BASE_URL) ||
      "",
  };
};

@Controller("settings")
export class AdminSettingsController {
  @Get("commissions")
  getCommissionSettings() {
    const settings = readCommissionSettings();

    return {
      ...settings,
      directLevels: settings.directLevelRates.length,
      uniLevels: settings.uniLevelRates.length,
    };
  }

  @Put("commissions")
  updateCommissionSettings(@Body() body: Record<string, unknown>) {
    const payload = body ?? {};
    const current = readCommissionSettings();

    if (!Array.isArray(payload.directLevelRates) || payload.directLevelRates.length === 0) {
      throw new BadRequestException("directLevelRates must contain at least one level.");
    }
    if (payload.directLevelRates.length > MAX_DIRECT_LEVELS) {
      throw new BadRequestException(
        `directLevelRates must not exceed ${MAX_DIRECT_LEVELS} levels.`,
      );
    }

    if (!Array.isArray(payload.uniLevelRates) || payload.uniLevelRates.length === 0) {
      throw new BadRequestException("uniLevelRates must contain at least one level.");
    }
    if (payload.uniLevelRates.length > MAX_UNI_LEVELS) {
      throw new BadRequestException(
        `uniLevelRates must not exceed ${MAX_UNI_LEVELS} levels.`,
      );
    }

    const settings = writeCommissionSettings({
      directLevelRates: payload.directLevelRates.map((value, index) =>
        requireDecimalRateString(value, `directLevelRates[${index}]`),
      ),
      uniLevelRates: payload.uniLevelRates.map((value, index) =>
        requireDecimalRateString(value, `uniLevelRates[${index}]`),
      ),
      matchingLevelRates: Array.isArray(payload.matchingLevelRates)
        ? payload.matchingLevelRates.map((value, index) =>
            requireDecimalRateString(value, `matchingLevelRates[${index}]`),
          )
        : current.matchingLevelRates,
      teamTwoLegRate: requireDecimalRateString(
        optionalString(payload.teamTwoLegRate) ?? current.teamTwoLegRate,
        "teamTwoLegRate",
      ),
      teamThreeLegRate: requireDecimalRateString(
        optionalString(payload.teamThreeLegRate) ?? current.teamThreeLegRate,
        "teamThreeLegRate",
      ),
      dailyCommissionCapAmount: requireDecimalRateString(
        optionalString(payload.dailyCommissionCapAmount) ??
          current.dailyCommissionCapAmount,
        "dailyCommissionCapAmount",
      ),
      buybackThresholdAmount: requireDecimalRateString(
        optionalString(payload.buybackThresholdAmount) ??
          current.buybackThresholdAmount,
        "buybackThresholdAmount",
      ),
      buybackRepurchaseAmount: requireDecimalRateString(
        optionalString(payload.buybackRepurchaseAmount) ??
          current.buybackRepurchaseAmount,
        "buybackRepurchaseAmount",
      ),
      buybackGraceDays:
        typeof payload.buybackGraceDays === "number"
          ? payload.buybackGraceDays
          : Number.parseInt(
              optionalString(payload.buybackGraceDays) ??
                `${current.buybackGraceDays}`,
              10,
            ),
      poolMinActivePackageBuyerDirects:
        typeof payload.poolMinActivePackageBuyerDirects === "number"
          ? payload.poolMinActivePackageBuyerDirects
          : Number.parseInt(
              optionalString(payload.poolMinActivePackageBuyerDirects) ??
                `${current.poolMinActivePackageBuyerDirects}`,
              10,
            ),
      poolMaxEntitlementShareRate: requireDecimalRateString(
        optionalString(payload.poolMaxEntitlementShareRate) ??
          current.poolMaxEntitlementShareRate,
        "poolMaxEntitlementShareRate",
      ),
      poolRate: requireDecimalRateString(payload.poolRate, "poolRate"),
      cashbackRate: requireDecimalRateString(payload.cashbackRate, "cashbackRate"),
      appVisibility: {
        cashback:
          payload.cashbackVisible === undefined
            ? current.appVisibility.cashback
            : payload.cashbackVisible === true ||
              payload.cashbackVisible === "true" ||
              payload.cashbackVisible === "1",
        direct:
          payload.directVisible === undefined
            ? current.appVisibility.direct
            : payload.directVisible === true ||
              payload.directVisible === "true" ||
              payload.directVisible === "1",
        matching:
          payload.matchingVisible === undefined
            ? current.appVisibility.matching
            : payload.matchingVisible === true ||
              payload.matchingVisible === "true" ||
              payload.matchingVisible === "1",
        team:
          payload.teamVisible === undefined
            ? current.appVisibility.team
            : payload.teamVisible === true ||
              payload.teamVisible === "true" ||
              payload.teamVisible === "1",
        unilevel:
          payload.unilevelVisible === undefined
            ? current.appVisibility.unilevel
            : payload.unilevelVisible === true ||
              payload.unilevelVisible === "true" ||
              payload.unilevelVisible === "1",
        matrix:
          payload.matrixVisible === undefined
            ? current.appVisibility.matrix
            : payload.matrixVisible === true ||
              payload.matrixVisible === "true" ||
              payload.matrixVisible === "1",
        pool:
          payload.poolVisible === undefined
            ? current.appVisibility.pool
            : payload.poolVisible === true ||
              payload.poolVisible === "true" ||
              payload.poolVisible === "1",
      },
    });

    return {
      ...settings,
      directLevels: settings.directLevelRates.length,
      uniLevels: settings.uniLevelRates.length,
    };
  }

  @Get("wallets")
  getWalletSettings() {
    return readWalletSettings();
  }

  @Put("wallets")
  updateWalletSettings(@Body() body: Record<string, unknown>) {
    const payload = body ?? {};

    return writeWalletSettings({
      commissionToShoppingEnabled:
        payload.commissionToShoppingEnabled === true ||
        payload.commissionToShoppingEnabled === "true" ||
        payload.commissionToShoppingEnabled === "1",
      commissionToShoppingFeeRate: requireDecimalRateString(
        payload.commissionToShoppingFeeRate ?? "0",
        "commissionToShoppingFeeRate",
      ),
      walletTransferEnabled:
        payload.walletTransferEnabled === true ||
        payload.walletTransferEnabled === "true" ||
        payload.walletTransferEnabled === "1",
      walletTransferFeeRate: requireDecimalRateString(
        payload.walletTransferFeeRate ?? "0",
        "walletTransferFeeRate",
      ),
      walletTopupEnabled:
        payload.walletTopupEnabled === true ||
        payload.walletTopupEnabled === "true" ||
        payload.walletTopupEnabled === "1",
      shoppingWalletSpendEnabled:
        payload.shoppingWalletSpendEnabled === true ||
        payload.shoppingWalletSpendEnabled === "true" ||
        payload.shoppingWalletSpendEnabled === "1",
      discountWalletSpendEnabled:
        payload.discountWalletSpendEnabled === true ||
        payload.discountWalletSpendEnabled === "true" ||
        payload.discountWalletSpendEnabled === "1",
      orderCashPaymentMethods: Array.isArray(payload.orderCashPaymentMethods)
        ? payload.orderCashPaymentMethods
            .map((value) => optionalString(value))
            .filter((value): value is string => Boolean(value))
        : undefined,
      walletTopupPaymentMethods: Array.isArray(payload.walletTopupPaymentMethods)
        ? payload.walletTopupPaymentMethods
            .map((value) => optionalString(value))
            .filter((value): value is string => Boolean(value))
        : undefined,
    });
  }

  @Get("manual-payment")
  getManualPaymentSettings() {
    return readManualPaymentSettings();
  }

  @Put("manual-payment")
  updateManualPaymentSettings(@Body() body: Record<string, unknown>) {
    const payload = body ?? {};

    return writeManualPaymentSettings({
      accountName: optionalString(payload.accountName) ?? undefined,
      bankName: optionalString(payload.bankName) ?? undefined,
      accountNumber: optionalString(payload.accountNumber) ?? undefined,
      promptPayName: optionalString(payload.promptPayName) ?? undefined,
      promptPayNumber: optionalString(payload.promptPayNumber) ?? undefined,
      qrImageUrl: optionalString(payload.qrImageUrl) ?? "",
      note: optionalString(payload.note) ?? undefined,
    });
  }

  @Get("signup-share")
  getSignupShareSettings() {
    return readSignupShareSettings();
  }

  @Get("line-runtime")
  getLineRuntimeSettings() {
    return readLineRuntimeSettings();
  }

  @Put("signup-share")
  updateSignupShareSettings(@Body() body: Record<string, unknown>) {
    const payload = body ?? {};

    return writeSignupShareSettings({
      shareLinkMessage: optionalString(payload.shareLinkMessage) ?? "",
      signupSuccessMessage: optionalString(payload.signupSuccessMessage) ?? "",
    });
  }
}
