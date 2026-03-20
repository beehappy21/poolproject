import { Body, Controller, Get, Put } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";

import {
  requireDecimalString,
} from "./http/request.util";
import {
  readCommissionSettings,
  writeCommissionSettings,
} from "../../../packages/shared/utils/src/commission-settings.util";

@Controller("settings")
export class AdminSettingsController {
  @Get("commissions")
  getCommissionSettings() {
    const settings = readCommissionSettings();

    return {
      ...settings,
      uniLevels: settings.uniLevelRates.length,
    };
  }

  @Put("commissions")
  updateCommissionSettings(@Body() body: Record<string, unknown>) {
    const payload = body ?? {};

    if (!Array.isArray(payload.uniLevelRates) || payload.uniLevelRates.length === 0) {
      throw new BadRequestException("uniLevelRates must contain at least one level.");
    }

    const settings = writeCommissionSettings({
      directRate: requireDecimalString(payload.directRate, "directRate"),
      uniLevelRates: payload.uniLevelRates.map((value, index) =>
        requireDecimalString(value, `uniLevelRates[${index}]`),
      ),
      poolRate: requireDecimalString(payload.poolRate, "poolRate"),
    });

    return {
      ...settings,
      uniLevels: settings.uniLevelRates.length,
    };
  }
}
