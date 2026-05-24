import { Controller, Get } from "@nestjs/common";
import { Public } from "../../../packages/modules/auth/src/access-control/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  getHealth(): { status: string } {
    return { status: "ok" };
  }
}
