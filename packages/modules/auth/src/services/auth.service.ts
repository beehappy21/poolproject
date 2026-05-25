import { BadRequestException, Inject, Injectable, UnauthorizedException, forwardRef } from "@nestjs/common";

import {
  AuthSessionResult,
  AuthUserSummary,
  LineBindingSummary,
} from "../domain/auth.types";
import { MembersService } from "../../../members/src/services/members.service";
import { PrismaAuthRepository } from "../repositories/auth.repository";
import { createSessionToken } from "../session/session-token.util";
import { SESSION_STORE, type SessionStore } from "../session/session-store";
import { getSessionStoreConfig } from "../session/session-env.util";
import { AuthBruteForceService } from "../brute-force/auth-brute-force.service";

export interface AuthServiceContract {
  login(input: {
    identifier: string;
    password: string;
    ip?: string | null;
  }): Promise<AuthSessionResult>;

  getSessionUser(token: string): Promise<AuthUserSummary | null>;

  logout(token: string): Promise<void>;

  logoutAllForUser(userId: string): Promise<number>;

  changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    adminOverridePassword?: string | null;
  }): Promise<{ userId: string; passwordUpdated: true }>;

  resetPasswordFromIdentifier(input: {
    identifier: string;
    adminOverridePassword?: string | null;
  }): Promise<{
    userId: string;
    memberCode: string;
    passwordUpdated: true;
    passwordRule: "national_id_last_6_digits" | "protected_super_admin_fixed";
  }>;
}

@Injectable()
export class AuthService implements AuthServiceContract {
  private readonly isProduction = process.env.NODE_ENV === "production";
  private readonly sessionTtlSeconds = getSessionStoreConfig().ttlSeconds;
  private readonly devImpersonationPassword =
    process.env.DEV_MEMBER_IMPERSONATION_PASSWORD ||
    (this.isProduction ? "" : "a1a1a1");
  private readonly protectedSuperAdminEmail =
    (
      process.env.SUPER_ADMIN_EMAIL ||
      (this.isProduction ? "" : "dev-admin@example.com")
    ).trim().toLowerCase();
  private readonly protectedSuperAdminMemberCode =
    (
      process.env.SUPER_ADMIN_MEMBER_CODE ||
      (this.isProduction ? "" : "ADMINLOCAL001")
    ).trim().toUpperCase();
  private readonly protectedSuperAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD || (this.isProduction ? "" : "472121");
  private readonly protectedSuperAdminOverridePassword =
    process.env.SUPER_ADMIN_OVERRIDE_PASSWORD ||
    (this.isProduction ? "" : "@4721Funnylife");

  constructor(
    private readonly authRepository: PrismaAuthRepository,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    @Inject(SESSION_STORE)
    private readonly sessionStore: SessionStore,
    private readonly bruteForceService: AuthBruteForceService,
  ) {}

  async login(input: {
    identifier: string;
    password: string;
    ip?: string | null;
  }): Promise<AuthSessionResult> {
    const attemptContext = {
      identifier: input.identifier,
      ip: input.ip,
    };
    await this.bruteForceService.assertCanAttemptLogin(attemptContext);

    const canUseDevImpersonation =
      process.env.NODE_ENV !== "production" &&
      input.password === this.devImpersonationPassword;

    const user = canUseDevImpersonation
      ? await this.authRepository.findUserByIdentifier(input.identifier)
      : await this.authRepository.findUserForLogin(input);

    if (!user) {
      await this.bruteForceService.recordFailedLogin(attemptContext);
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (canUseDevImpersonation && this.isProtectedSuperAdminUser(user)) {
      await this.bruteForceService.recordFailedLogin(attemptContext);
      throw new UnauthorizedException("Invalid credentials.");
    }

    const accessToken = createSessionToken();
    await this.sessionStore.createSession({
      token: accessToken,
      userId: user.userId,
      ttlSeconds: this.sessionTtlSeconds,
    });
    await this.bruteForceService.recordSuccessfulLogin(attemptContext);

    return {
      accessToken,
      user,
    };
  }

  async createSessionForUserId(userId: string): Promise<AuthSessionResult> {
    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException("Invalid session user.");
    }

    const accessToken = createSessionToken();
    await this.sessionStore.createSession({
      token: accessToken,
      userId: user.userId,
      ttlSeconds: this.sessionTtlSeconds,
    });

    return {
      accessToken,
      user,
    };
  }

  async verifyLineIdentity(input: {
    lineUserId: string;
    lineIdToken?: string | null;
  }): Promise<void> {
    const normalizedUserId = input.lineUserId.trim();
    const normalizedToken = input.lineIdToken?.trim() || "";
    const lineChannelId =
      process.env.LINE_CHANNEL_ID?.trim() ||
      process.env.LINE_LOGIN_CHANNEL_ID?.trim() ||
      "";
    const strictMode =
      process.env.LINE_STRICT_VERIFY === "true" || process.env.NODE_ENV === "production";

    if (!normalizedToken || !lineChannelId) {
      if (strictMode) {
        throw new BadRequestException(
          "LINE identity verification is not configured correctly.",
        );
      }

      return;
    }

    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        id_token: normalizedToken,
        client_id: lineChannelId,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException("LINE identity verification failed.");
    }

    const payload = (await response.json()) as {
      sub?: string;
      exp?: number;
    };

    if (!payload?.sub || payload.sub !== normalizedUserId) {
      throw new UnauthorizedException("LINE identity does not match the requested account.");
    }

    if (
      typeof payload.exp === "number" &&
      payload.exp > 0 &&
      payload.exp * 1000 < Date.now()
    ) {
      throw new UnauthorizedException("LINE identity token has expired.");
    }
  }

  async getSessionUser(token: string): Promise<AuthUserSummary | null> {
    const session = await this.sessionStore.getSessionByToken(token);

    if (!session) {
      return null;
    }

    await this.sessionStore.touchSession(token, this.sessionTtlSeconds);
    const user = await this.authRepository.findUserById(session.userId);

    if (!user) {
      await this.sessionStore.revokeSession(token);
      return null;
    }

    return user;
  }

  async logout(token: string): Promise<void> {
    await this.sessionStore.revokeSession(token);
  }

  async logoutAllForUser(userId: string): Promise<number> {
    return this.sessionStore.revokeAllSessionsForUser(userId);
  }

  async changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    adminOverridePassword?: string | null;
  }): Promise<{ userId: string; passwordUpdated: true }> {
    const user = await this.authRepository.findUserById(input.userId);

    if (!user) {
      throw new UnauthorizedException("Invalid session user.");
    }

    if (this.isProtectedSuperAdminUser(user)) {
      this.assertProtectedSuperAdminOverride(input.adminOverridePassword);
    }

    const valid = await this.authRepository.verifyUserPassword(
      input.userId,
      input.currentPassword,
    );

    if (!valid) {
      throw new UnauthorizedException("Current password is invalid.");
    }

    return this.authRepository.updateUserPassword(input.userId, input.newPassword);
  }

  async resetPasswordFromIdentifier(input: {
    identifier: string;
    adminOverridePassword?: string | null;
  }): Promise<{
    userId: string;
    memberCode: string;
    passwordUpdated: true;
    passwordRule: "national_id_last_6_digits" | "protected_super_admin_fixed";
  }> {
    const user = await this.authRepository.findUserByIdentifier(input.identifier);

    if (!user) {
      throw new UnauthorizedException("ไม่พบสมาชิกจากข้อมูลที่กรอก");
    }

    if (this.isProtectedSuperAdminUser(user)) {
      this.assertProtectedSuperAdminOverride(input.adminOverridePassword);
      const result = await this.membersService.resetMemberPassword(
        user.userId,
        this.protectedSuperAdminPassword,
      );
      return {
        userId: result.memberId,
        memberCode: user.memberCode,
        passwordUpdated: true,
        passwordRule: "protected_super_admin_fixed",
      };
    }

    const member = await this.membersService.getMemberByCode(user.memberCode);
    const nationalId = String(member?.nationalId || "").replace(/\D+/g, "");

    if (nationalId.length < 6) {
      throw new BadRequestException("สมาชิกคนนี้ยังไม่มีเลขบัตรประชาชนอย่างน้อย 6 หลัก");
    }

    const newPassword = nationalId.slice(-6);
    const result = await this.membersService.resetMemberPassword(
      user.userId,
      newPassword,
    );

    return {
      userId: result.memberId,
      memberCode: user.memberCode,
      passwordUpdated: true,
      passwordRule: "national_id_last_6_digits",
    };
  }

  isAdminUser(user: AuthUserSummary | null | undefined): boolean {
    if (!user) {
      return false;
    }

    return user.isAdmin === true;
  }

  isProtectedSuperAdminUser(user: AuthUserSummary | null | undefined): boolean {
    if (!user || user.isAdmin !== true) {
      return false;
    }

    const email = String(user.email || "").trim().toLowerCase();
    const memberCode = String(user.memberCode || "").trim().toUpperCase();
    const adminRole = String(user.adminRole || "").trim().toUpperCase();

    return (
      adminRole === "SUPER_ADMIN" &&
      (email === this.protectedSuperAdminEmail ||
        memberCode === this.protectedSuperAdminMemberCode)
    );
  }

  assertProtectedSuperAdminOverride(password?: string | null): void {
    if ((password || "").trim() !== this.protectedSuperAdminOverridePassword) {
      throw new UnauthorizedException("Protected super admin override password required.");
    }
  }

  async getLineBindingByUserId(userId: string): Promise<LineBindingSummary | null> {
    return this.authRepository.findLineBindingByUserId(userId);
  }

  async getLineBindingByLineUserId(
    lineUserId: string,
  ): Promise<LineBindingSummary | null> {
    return this.authRepository.findLineBindingByLineUserId(lineUserId);
  }

  async listLineBindings(): Promise<LineBindingSummary[]> {
    return this.authRepository.listLineBindings();
  }

  async upsertLineBinding(input: {
    userId: string;
    memberCode: string;
    lineUserId: string;
    lineIdToken?: string | null;
    displayName: string | null;
    pictureUrl: string | null;
    statusMessage: string | null;
    source: string | null;
  }): Promise<LineBindingSummary> {
    await this.verifyLineIdentity({
      lineUserId: input.lineUserId,
      lineIdToken: input.lineIdToken,
    });

    return this.authRepository.upsertLineBinding({
      userId: input.userId,
      memberCode: input.memberCode,
      lineUserId: input.lineUserId,
      displayName: input.displayName,
      pictureUrl: input.pictureUrl,
      statusMessage: input.statusMessage,
      source: input.source,
    });
  }

  async removeLineBindingByUserId(
    userId: string,
  ): Promise<LineBindingSummary | null> {
    return this.authRepository.removeLineBindingByUserId(userId);
  }

  async forceRebindLineBindingByUserId(userId: string): Promise<{
    record: LineBindingSummary | null;
    removedDuplicates: LineBindingSummary[];
  }> {
    return this.authRepository.forceRebindLineBindingByUserId(userId);
  }

}
