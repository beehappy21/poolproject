import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import { AuthUserSummary } from "../domain/auth.types";

export interface AuthRepository {
  findUserForLogin(input: {
    identifier: string;
    password: string;
  }): Promise<AuthUserSummary | null>;

  findUserById(userId: string): Promise<AuthUserSummary | null>;

  verifyUserPassword(userId: string, password: string): Promise<boolean>;

  updateUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ userId: string; passwordUpdated: true }>;
}

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserForLogin(input: {
    identifier: string;
    password: string;
  }): Promise<AuthUserSummary | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordHash: input.password,
        OR: [
          { memberCode: input.identifier },
          { email: input.identifier.toLowerCase() },
        ],
      },
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
      },
    });

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
        }
      : null;
  }

  async findUserById(userId: string): Promise<AuthUserSummary | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
      },
    });

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
        }
      : null;
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: BigInt(userId),
        passwordHash: password,
      },
      select: { id: true },
    });

    return Boolean(user);
  }

  async updateUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ userId: string; passwordUpdated: true }> {
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { passwordHash: newPassword },
      select: { id: true },
    });

    return {
      userId,
      passwordUpdated: true,
    };
  }
}
