import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { AuthSessionResult, AuthUserSummary } from "../domain/auth.types";
import { PrismaAuthRepository } from "../repositories/auth.repository";

export interface AuthServiceContract {
  login(input: {
    identifier: string;
    password: string;
  }): Promise<AuthSessionResult>;

  getSessionUser(token: string): Promise<AuthUserSummary | null>;

  logout(token: string): Promise<void>;

  changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ userId: string; passwordUpdated: true }>;
}

@Injectable()
export class AuthService implements AuthServiceContract {
  private readonly sessions = new Map<string, string>();
  private readonly adminMemberCodes = new Set(
    (process.env.ADMIN_MEMBER_CODES || "ALICE")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
  );

  constructor(private readonly authRepository: PrismaAuthRepository) {}

  async login(input: {
    identifier: string;
    password: string;
  }): Promise<AuthSessionResult> {
    const user = await this.authRepository.findUserForLogin(input);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const accessToken = randomUUID();
    this.sessions.set(accessToken, user.userId);

    return {
      accessToken,
      user,
    };
  }

  async getSessionUser(token: string): Promise<AuthUserSummary | null> {
    const userId = this.sessions.get(token);

    if (!userId) {
      return null;
    }

    return this.authRepository.findUserById(userId);
  }

  async logout(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ userId: string; passwordUpdated: true }> {
    const valid = await this.authRepository.verifyUserPassword(
      input.userId,
      input.currentPassword,
    );

    if (!valid) {
      throw new UnauthorizedException("Current password is invalid.");
    }

    return this.authRepository.updateUserPassword(input.userId, input.newPassword);
  }

  isAdminUser(user: AuthUserSummary | null | undefined): boolean {
    if (!user) {
      return false;
    }

    return this.adminMemberCodes.has(user.memberCode.trim().toUpperCase());
  }
}
