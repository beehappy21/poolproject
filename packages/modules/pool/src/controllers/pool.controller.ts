import { Controller, Get, Param, Post } from "@nestjs/common";

import { PoolService } from "../services/pool.service";

@Controller("pool")
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get(":poolDate")
  async getPoolCycle(@Param("poolDate") poolDate: string) {
    return this.poolService.getPoolCycle(poolDate);
  }

  @Get(":poolDate/payouts")
  async listPoolPayouts(@Param("poolDate") poolDate: string) {
    return this.poolService.listPoolPayouts(poolDate);
  }

  @Post(":poolDate/close")
  async closePool(@Param("poolDate") poolDate: string) {
    return this.poolService.closePool(poolDate);
  }
}
