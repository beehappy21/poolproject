import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import {
  optionalString,
  optionalUrlString,
  requireDecimalString,
  requireNonEmptyString,
  requirePositiveIntegerString,
} from "../../../../../apps/api/src/http/request.util";
import { WalletsService } from "../services/wallets.service";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get(":userId")
  async getWalletSummary(@Param("userId") userId: string) {
    return this.walletsService.getWalletSummary(
      requirePositiveIntegerString(userId, "userId"),
    );
  }

  @Get(":userId/transactions")
  async listWalletTransactions(@Param("userId") userId: string) {
    return this.walletsService.listWalletTransactions(
      requirePositiveIntegerString(userId, "userId"),
    );
  }

  @Get("topup-requests")
  async listWalletTopupRequests(
    @Query("userId") userId?: string,
    @Query("status") status?: string,
  ) {
    return this.walletsService.listWalletTopupRequests({
      userId: optionalString(userId)
        ? requirePositiveIntegerString(userId, "userId")
        : undefined,
      status: optionalString(status)
        ? (requireNonEmptyString(status, "status").toLowerCase() as
            | "pending"
            | "approved"
            | "rejected"
            | "cancelled")
        : undefined,
    });
  }

  @Get(":userId/topup-requests")
  async listWalletTopupRequestsForUser(@Param("userId") userId: string) {
    return this.walletsService.listWalletTopupRequests({
      userId: requirePositiveIntegerString(userId, "userId"),
    });
  }

  @Post(":userId/topups")
  async topupShoppingWallet(
    @Param("userId") userId: string,
    @Body()
    body: {
      amount: string;
      paymentMethod: string;
      note?: string;
      actorUserId?: string;
    },
  ) {
    return this.walletsService.topupShoppingWallet({
      userId: requirePositiveIntegerString(userId, "userId"),
      amount: requireDecimalString(body.amount, "amount"),
      paymentMethod: requireNonEmptyString(body.paymentMethod, "paymentMethod")
        .toLowerCase(),
      note: optionalString(body.note),
      actorUserId: optionalString(body.actorUserId)
        ? requirePositiveIntegerString(body.actorUserId, "actorUserId")
        : null,
    });
  }

  @Post("topup-requests/:requestId/approve")
  async approveWalletTopupRequest(
    @Param("requestId") requestId: string,
    @Body() body: { actorUserId: string },
  ) {
    return this.walletsService.approveWalletTopupRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: requirePositiveIntegerString(body.actorUserId, "actorUserId"),
    });
  }

  @Post("topup-requests/:requestId/reject")
  async rejectWalletTopupRequest(
    @Param("requestId") requestId: string,
    @Body() body: { actorUserId: string; rejectionReason: string },
  ) {
    return this.walletsService.rejectWalletTopupRequest({
      requestId: requirePositiveIntegerString(requestId, "requestId"),
      actorUserId: requirePositiveIntegerString(body.actorUserId, "actorUserId"),
      rejectionReason: requireNonEmptyString(body.rejectionReason, "rejectionReason"),
    });
  }

  @Post(":userId/topup-requests")
  async createWalletTopupRequest(
    @Param("userId") userId: string,
    @Body()
    body: {
      amount: string;
      paymentMethod: string;
      transferSlipUrl?: string;
      note?: string;
    },
  ) {
    return this.walletsService.requestWalletTopup({
      userId: requirePositiveIntegerString(userId, "userId"),
      amount: requireDecimalString(body.amount, "amount"),
      paymentMethod: requireNonEmptyString(body.paymentMethod, "paymentMethod")
        .toLowerCase(),
      transferSlipUrl: optionalUrlString(body.transferSlipUrl, "transferSlipUrl"),
      note: optionalString(body.note),
    });
  }
}
