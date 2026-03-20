import { Controller, Param, Post } from "@nestjs/common";

import { PoolService } from "../services/pool.service";

@Controller("pool")
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Post(":poolDate/close")
  async closePool(@Param("poolDate") poolDate: string) {
    return this.poolService.closePool(poolDate);
  }
}
