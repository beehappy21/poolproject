import { ConflictException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/src/prisma/prisma.service";
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "../../../../shared/utils/src/password.util";
import { AuthUserSummary, LineBindingSummary } from "../domain/auth.types";

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

  findLineBindingByUserId(userId: string): Promise<LineBindingSummary | null>;

  findLineBindingByLineUserId(
    lineUserId: string,
  ): Promise<LineBindingSummary | null>;

  listLineBindings(): Promise<LineBindingSummary[]>;

  upsertLineBinding(input: {
    userId: string;
    memberCode: string;
    lineUserId: string;
    displayName: string | null;
    pictureUrl: string | null;
    statusMessage: string | null;
    source: string | null;
  }): Promise<LineBindingSummary>;

  removeLineBindingByUserId(userId: string): Promise<LineBindingSummary | null>;

  forceRebindLineBindingByUserId(userId: string): Promise<{
    record: LineBindingSummary | null;
    removedDuplicates: LineBindingSummary[];
  }>;
}

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapLineBinding(
    binding: {
      userId: bigint;
      lineUserId: string;
      displayName: string | null;
      pictureUrl: string | null;
      statusMessage: string | null;
      source: string | null;
      boundAt: Date;
      lastSyncedAt: Date;
      user: {
        memberCode: string;
      };
    },
  ): LineBindingSummary {
    return {
      userId: binding.userId.toString(),
      memberCode: binding.user.memberCode,
      lineUserId: binding.lineUserId,
      displayName: binding.displayName,
      pictureUrl: binding.pictureUrl,
      statusMessage: binding.statusMessage,
      source: binding.source,
      boundAt: binding.boundAt.toISOString(),
      lastSyncedAt: binding.lastSyncedAt.toISOString(),
    };
  }

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
        matrixReentryEnabled: true,
      },
    });

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
          matrixReentryEnabled: user.matrixReentryEnabled,
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
        matrixReentryEnabled: true,
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
          matrixReentryEnabled: user.matrixReentryEnabled,
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
        matrixReentryEnabled: true,
      },
    });

    return user
      ? {
          userId: user.id.toString(),
          memberCode: user.memberCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
          matrixReentryEnabled: user.matrixReentryEnabled,
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

  async findLineBindingByUserId(
    userId: string,
  ): Promise<LineBindingSummary | null> {
    const binding = await this.prisma.lineBinding.findUnique({
      where: { userId: BigInt(userId) },
      select: {
        userId: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        source: true,
        boundAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    return binding ? this.mapLineBinding(binding) : null;
  }

  async findLineBindingByLineUserId(
    lineUserId: string,
  ): Promise<LineBindingSummary | null> {
    const binding = await this.prisma.lineBinding.findUnique({
      where: { lineUserId },
      select: {
        userId: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        source: true,
        boundAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    return binding ? this.mapLineBinding(binding) : null;
  }

  async listLineBindings(): Promise<LineBindingSummary[]> {
    const items = await this.prisma.lineBinding.findMany({
      orderBy: [{ lastSyncedAt: "desc" }],
      select: {
        userId: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        source: true,
        boundAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    return items.map((item) => this.mapLineBinding(item));
  }

  async upsertLineBinding(input: {
    userId: string;
    memberCode: string;
    lineUserId: string;
    displayName: string | null;
    pictureUrl: string | null;
    statusMessage: string | null;
    source: string | null;
  }): Promise<LineBindingSummary> {
    const existingByLine = await this.prisma.lineBinding.findUnique({
      where: { lineUserId: input.lineUserId },
      select: { userId: true },
    });

    if (existingByLine && existingByLine.userId.toString() !== input.userId) {
      throw new ConflictException(
        "LINE account is already connected to another member.",
      );
    }

    const record = await this.prisma.lineBinding.upsert({
      where: { userId: BigInt(input.userId) },
      create: {
        userId: BigInt(input.userId),
        lineUserId: input.lineUserId,
        displayName: input.displayName,
        pictureUrl: input.pictureUrl,
        statusMessage: input.statusMessage,
        source: input.source,
        boundAt: new Date(),
      },
      update: {
        lineUserId: input.lineUserId,
        displayName: input.displayName,
        pictureUrl: input.pictureUrl,
        statusMessage: input.statusMessage,
        source: input.source,
        lastSyncedAt: new Date(),
      },
      select: {
        userId: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        source: true,
        boundAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    return this.mapLineBinding(record);
  }

  async removeLineBindingByUserId(
    userId: string,
  ): Promise<LineBindingSummary | null> {
    const existing = await this.findLineBindingByUserId(userId);

    if (!existing) {
      return null;
    }

    await this.prisma.lineBinding.delete({
      where: { userId: BigInt(userId) },
    });

    return existing;
  }

  async forceRebindLineBindingByUserId(userId: string): Promise<{
    record: LineBindingSummary | null;
    removedDuplicates: LineBindingSummary[];
  }> {
    const record = await this.findLineBindingByUserId(userId);

    if (!record) {
      return {
        record: null,
        removedDuplicates: [],
      };
    }

    const duplicateRows = await this.prisma.lineBinding.findMany({
      where: {
        lineUserId: record.lineUserId,
        NOT: {
          userId: BigInt(userId),
        },
      },
      select: {
        userId: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        source: true,
        boundAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    if (duplicateRows.length > 0) {
      await this.prisma.lineBinding.deleteMany({
        where: {
          lineUserId: record.lineUserId,
          NOT: {
            userId: BigInt(userId),
          },
        },
      });
    }

    const updated = await this.prisma.lineBinding.update({
      where: { userId: BigInt(userId) },
      data: {
        source: "admin_force_rebind",
        lastSyncedAt: new Date(),
      },
      select: {
        userId: true,
        lineUserId: true,
        displayName: true,
        pictureUrl: true,
        statusMessage: true,
        source: true,
        boundAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            memberCode: true,
          },
        },
      },
    });

    return {
      record: this.mapLineBinding(updated),
      removedDuplicates: duplicateRows.map((item) => this.mapLineBinding(item)),
    };
  }
}
