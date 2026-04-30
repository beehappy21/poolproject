import { Controller, Get, Param } from "@nestjs/common";

import { requirePositiveIntegerString } from "../../../../../apps/api/src/http/request.util";
import { CapService } from "../services/cap.service";

@Controller("cap")
export class CapController {
  constructor(private readonly capService: CapService) {}

  @Get(":userId")
  async getCapSummary(@Param("userId") userId: string) {
    return this.capService.getCapSummary(
      requirePositiveIntegerString(userId, "userId"),
    );
  }
}
