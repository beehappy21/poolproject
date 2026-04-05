import { BadRequestException, Body, Controller, Get, Put } from "@nestjs/common";

import {
  requireDecimalRateString,
  requireDecimalString,
} from "./http/request.util";
import {
  readMatrixSettings,
  writeMatrixSettings,
} from "../../../packages/shared/utils/src/matrix-settings.util";

const FIXED_BOARD_WIDTH = 2;
const FIXED_BOARD_DEPTH = 3;
const FIXED_BOARD_COUNT = 3;

@Controller("settings")
export class AdminMatrixSettingsController {
  @Get("matrix")
  getMatrixSettings() {
    const settings = readMatrixSettings();

    return {
      ...settings,
      slotCountPerBoard: settings.boardDepths.map((depth) =>
        this.getSlotCountPerBoard(settings.boardWidth, depth),
      ),
    };
  }

  @Put("matrix")
  updateMatrixSettings(@Body() body: Record<string, unknown>) {
    const payload = body ?? {};
    const current = readMatrixSettings();
    const boardWidth = current.boardWidth ?? FIXED_BOARD_WIDTH;
    const boardDepth = current.boardDepth ?? FIXED_BOARD_DEPTH;
    const boardDepths = current.boardDepths ?? [3, 2, 2];
    const boardCount = current.boardCount ?? FIXED_BOARD_COUNT;

    if (boardWidth !== FIXED_BOARD_WIDTH) {
      throw new BadRequestException("matrix boardWidth must remain fixed at 2.");
    }

    if (boardDepth !== FIXED_BOARD_DEPTH) {
      throw new BadRequestException("matrix max boardDepth must remain fixed at 3.");
    }

    if (boardCount !== FIXED_BOARD_COUNT) {
      throw new BadRequestException("matrix boardCount must remain fixed at 3.");
    }

    if (boardDepths.length !== boardCount || boardDepths.join(",") !== "3,2,2") {
      throw new BadRequestException("matrix boardDepths must remain fixed at [3,2,2].");
    }

    if (!Array.isArray(payload.levelRates) || payload.levelRates.length !== boardDepth) {
      throw new BadRequestException(
        `levelRates must contain exactly ${boardDepth} entries.`,
      );
    }

    if (
      !Array.isArray(payload.boardLevelRates) ||
      payload.boardLevelRates.length !== boardCount ||
      payload.boardLevelRates.some(
        (rates, index) => !Array.isArray(rates) || rates.length !== boardDepths[index],
      )
    ) {
      throw new BadRequestException(
        "boardLevelRates must match board depths [3,2,2].",
      );
    }

    if (
      !Array.isArray(payload.boardOpenPvThresholds) ||
      payload.boardOpenPvThresholds.length !== boardCount
    ) {
      throw new BadRequestException(
        `boardOpenPvThresholds must contain exactly ${boardCount} entries.`,
      );
    }

    const settings = writeMatrixSettings({
      boardWidth,
      boardDepth,
      boardDepths,
      boardCount,
      organizationPvRate: requireDecimalString(
        payload.organizationPvRate,
        "organizationPvRate",
      ),
      autoOrderAmount: requireDecimalString(
        payload.autoOrderAmount ??
          payload.cwReentryAmount ??
          current.autoOrderAmount ??
          current.cwReentryAmount ??
          current.organizationPvRate,
        "autoOrderAmount",
      ),
      autoOrderFirmAmount: requireDecimalString(
        payload.autoOrderFirmAmount ??
          payload.reentryFirmAmount ??
          current.autoOrderFirmAmount ??
          current.reentryFirmAmount ??
          current.autoOrderAmount ??
          current.cwReentryAmount,
        "autoOrderFirmAmount",
      ),
      autoOrderPvAmount: requireDecimalString(
        payload.autoOrderPvAmount ??
          payload.reentryPvAmount ??
          current.autoOrderPvAmount ??
          current.reentryPvAmount ??
          current.organizationPvRate,
        "autoOrderPvAmount",
      ),
      cwReentryAmount: requireDecimalString(
        payload.autoOrderAmount ??
          payload.cwReentryAmount ??
          current.autoOrderAmount ??
          current.cwReentryAmount ??
          current.organizationPvRate,
        "cwReentryAmount",
      ),
      reentryFirmAmount: requireDecimalString(
        payload.autoOrderFirmAmount ??
          payload.reentryFirmAmount ??
          current.autoOrderFirmAmount ??
          current.reentryFirmAmount ??
          current.autoOrderAmount ??
          current.cwReentryAmount,
        "reentryFirmAmount",
      ),
      reentryPvAmount: requireDecimalString(
        payload.autoOrderPvAmount ??
          payload.reentryPvAmount ??
          current.autoOrderPvAmount ??
          current.reentryPvAmount ??
          current.organizationPvRate,
        "reentryPvAmount",
      ),
      levelRates: payload.levelRates.map((value, index) =>
        requireDecimalRateString(value, `levelRates[${index}]`),
      ),
      boardLevelRates: payload.boardLevelRates.map((rates, boardIndex) =>
        (rates as unknown[]).map((value, levelIndex) =>
          requireDecimalRateString(
            value,
            `boardLevelRates[${boardIndex}][${levelIndex}]`,
          ),
        ),
      ),
      boardOpenPvThresholds: payload.boardOpenPvThresholds.map((value, index) =>
        requireDecimalString(value, `boardOpenPvThresholds[${index}]`),
      ),
    });

    return {
      ...settings,
      slotCountPerBoard: settings.boardDepths.map((depth) =>
        this.getSlotCountPerBoard(settings.boardWidth, depth),
      ),
    };
  }

  private getSlotCountPerBoard(boardWidth: number, boardDepth: number): number {
    let total = 0;

    for (let level = 1; level <= boardDepth; level += 1) {
      total += boardWidth ** level;
    }

    return total;
  }
}
