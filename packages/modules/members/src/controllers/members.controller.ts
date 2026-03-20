import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";

import { MembersService } from "../services/members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get(":memberId")
  async getMember(@Param("memberId") memberId: string) {
    const member = await this.membersService.getMember(memberId);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return member;
  }

  @Get("by-code/:memberCode")
  async getMemberByCode(@Param("memberCode") memberCode: string) {
    const member = await this.membersService.getMemberByCode(memberCode);

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    return member;
  }

  @Post()
  async createMember(
    @Body()
    body: {
      memberCode: string;
      name: string;
      email?: string;
      phone?: string;
      sponsorId?: string | null;
      sponsorCode?: string | null;
    },
  ) {
    return this.membersService.createMember(body);
  }

  @Post(":memberId/activate-package")
  async activatePackage(
    @Param("memberId") memberId: string,
    @Body() body: { packageId: string },
  ) {
    return this.membersService.activatePackageCycle({
      memberId,
      packageId: body.packageId,
    });
  }
}
