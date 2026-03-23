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

const MAX_DIRECT_LEVELS = 10;
const MAX_UNI_LEVELS = 20;

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
      poolRate: requireDecimalRateString(payload.poolRate, "poolRate"),
      cashbackRate: requireDecimalRateString(payload.cashbackRate, "cashbackRate"),
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
}
