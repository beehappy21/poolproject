import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "../../../../shared/utils/src/password.util";
import { AuthUserSummary } from "../domain/auth.types";

export interface AuthRepository {
  findUserForLogin(input: {
    identifier: string;
    password: string;
  }): Promise<AuthUserSummary | null>;

  findUserByIdentifier(identifier: string): Promise<AuthUserSummary | null>;

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

  async findUserByIdentifier(identifier: string): Promise<AuthUserSummary | null> {
    const normalizedIdentifier = identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          {
            memberCode: {
              equals: normalizedIdentifier,
              mode: "insensitive" as const,
            },
          },
          { email: normalizedIdentifier.toLowerCase() },
          { phone: normalizedIdentifier },
        ],
      },
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      : null;
  }

  async findUserForLogin(input: {
    identifier: string;
    password: string;
  }): Promise<AuthUserSummary | null> {
    const normalizedIdentifier = input.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          {
            memberCode: {
              equals: normalizedIdentifier,
              mode: "insensitive" as const,
            },
          },
          { email: normalizedIdentifier.toLowerCase() },
          { phone: normalizedIdentifier },
        ],
      },
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
      },
    });

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return null;
    }

    if (!isHashedPassword(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(input.password) },
      });
    }

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      : null;
  }

  async findUserById(userId: string): Promise<AuthUserSummary | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: BigInt(userId), status: "ACTIVE" },
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      : null;
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: BigInt(userId),
      },
      select: { id: true, passwordHash: true },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return false;
    }

    if (!isHashedPassword(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }

    return true;
  }

  async updateUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ userId: string; passwordUpdated: true }> {
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { passwordHash: hashPassword(newPassword) },
      select: { id: true },
    });

    return {
      userId,
      passwordUpdated: true,
    };
  }
}
