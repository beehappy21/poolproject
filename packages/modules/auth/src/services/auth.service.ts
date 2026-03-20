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
}

@Injectable()
export class AuthService implements AuthServiceContract {
  private readonly sessions = new Map<string, string>();

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
}
