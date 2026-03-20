import { Controller, Get, Param } from "@nestjs/common";

import { WalletsService } from "../services/wallets.service";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get(":userId")
  async getWalletSummary(@Param("userId") userId: string) {
    return this.walletsService.getWalletSummary(userId);
  }

  @Get(":userId/transactions")
  async listWalletTransactions(@Param("userId") userId: string) {
    return this.walletsService.listWalletTransactions(userId);
  }
}
