import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
  private readonly devImpersonationPassword =
    process.env.DEV_MEMBER_IMPERSONATION_PASSWORD || "a1a1a1";
  private readonly adminMemberCodes = new Set(
    (process.env.ADMIN_MEMBER_CODES || "TH0000013")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
  );
  private readonly sessionStorePath = join(
    process.cwd(),
    "runtime",
    "auth-sessions.json",
  );

  constructor(private readonly authRepository: PrismaAuthRepository) {
    this.loadSessionsFromDisk();
  }

  async login(input: {
    identifier: string;
    password: string;
  }): Promise<AuthSessionResult> {
    const canUseDevImpersonation =
      process.env.NODE_ENV !== "production" &&
      input.password === this.devImpersonationPassword;

    const user = canUseDevImpersonation
      ? await this.authRepository.findUserByIdentifier(input.identifier)
      : await this.authRepository.findUserForLogin(input);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const accessToken = randomUUID();
    this.sessions.set(accessToken, user.userId);
    this.persistSessionsToDisk();

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
    this.persistSessionsToDisk();
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

  private loadSessionsFromDisk(): void {
    try {
      const raw = readFileSync(this.sessionStorePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, string>;

      for (const [token, userId] of Object.entries(parsed)) {
        if (typeof token === "string" && typeof userId === "string") {
          this.sessions.set(token, userId);
        }
      }
    } catch {
      // Start with an empty in-memory store when no persisted session file exists.
    }
  }

  private persistSessionsToDisk(): void {
    mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
    writeFileSync(
      this.sessionStorePath,
      JSON.stringify(Object.fromEntries(this.sessions.entries()), null, 2),
      "utf8",
    );
  }
}
