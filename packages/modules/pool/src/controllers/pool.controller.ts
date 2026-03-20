import { Controller, Get, Param, Post, Query } from "@nestjs/common";

import {
  requireDateOnlyString,
  optionalPositiveInteger,
  rethrowHttpError,
} from "../../../../../apps/api/src/http/request.util";
import { PoolService } from "../services/pool.service";

@Controller("pool")
export class PoolController {
  constructor(
    private readonly poolService: PoolService,
  ) {}

  @Get()
  async listPoolCycles(
    @Query("poolDate") poolDate?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.poolService.listPoolCycles({
      poolDate: poolDate ? requireDateOnlyString(poolDate, "poolDate") : undefined,
      page: optionalPositiveInteger(page, "page"),
      pageSize: optionalPositiveInteger(pageSize, "pageSize"),
    });
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

  @Get(":poolDate/snapshot")
  async getPoolSnapshot(@Param("poolDate") poolDate: string) {
    const validatedPoolDate = requireDateOnlyString(poolDate, "poolDate");
    const [cycle, payouts] = await Promise.all([
      this.poolService.getPoolCycle(validatedPoolDate),
      this.poolService.listPoolPayouts(validatedPoolDate),
    ]);

    return {
      cycle,
      payouts,
    };
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
