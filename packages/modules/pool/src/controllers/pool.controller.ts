import { Controller, Get, Param, Post } from "@nestjs/common";

import {
  requireDateOnlyString,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { PoolService } from "../services/pool.service";

@Controller("pool")
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get()
  async listPoolCycles() {
    return this.poolService.listPoolCycles();
  }

  @Get(":poolDate")
  async getPoolCycle(@Param("poolDate") poolDate: string) {
    return this.poolService.getPoolCycle(
      requireDateOnlyString(poolDate, "poolDate"),
    );
  }

  @Get(":poolDate/payouts")
  async listPoolPayouts(@Param("poolDate") poolDate: string) {
    return this.poolService.listPoolPayouts(
      requireDateOnlyString(poolDate, "poolDate"),
    );
  }

  @Post(":poolDate/close")
  async closePool(@Param("poolDate") poolDate: string) {
    try {
      return await this.poolService.closePool(
        requireDateOnlyString(poolDate, "poolDate"),
      );
    } catch (error) {
      rethrowHttpError(error);
    }
  }
}
