import { Body, Controller, Get, Put } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";

import {
  requireDecimalRateString,
} from "./http/request.util";
import {
  readCommissionSettings,
  writeCommissionSettings,
} from "../../../packages/shared/utils/src/commission-settings.util";

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
    });

    return {
      ...settings,
      directLevels: settings.directLevelRates.length,
      uniLevels: settings.uniLevelRates.length,
    };
  }
}
