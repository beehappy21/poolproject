import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Res,
  UnauthorizedException,
} from "@nestjs/common";

import {
  requireNonEmptyString,
} from "../../../../../apps/api/src/http/request.util";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body()
    body: {
      identifier: string;
      password: string;
    },
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
  ) {
    const session = await this.authService.login({
      identifier: requireNonEmptyString(body.identifier, "identifier"),
      password: requireNonEmptyString(body.password, "password"),
    });

    response.setHeader("Set-Cookie", this.buildSessionCookie(session.accessToken));
    return session;
  }

  @Get("me")
  async me(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    const token = this.extractToken(authorization, cookieHeader);
    const user = await this.authService.getSessionUser(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    return { user };
  }

  @Post("logout")
  async logout(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
    @Res({ passthrough: true }) response?: { setHeader(name: string, value: string): void },
  ) {
    const token = this.extractToken(authorization, cookieHeader);
    await this.authService.logout(token);
    response?.setHeader("Set-Cookie", this.clearSessionCookie());
    return { success: true };
  }

  private extractToken(authorization?: string, cookieHeader?: string): string {
    const normalized = (authorization || "").trim();

    if (normalized.toLowerCase().startsWith("bearer ")) {
      const token = normalized.slice(7).trim();

      if (!token) {
        throw new UnauthorizedException("Missing bearer token.");
      }

      return token;
    }

    const cookieToken = this.readCookie(cookieHeader, "adminAccessToken");

    if (!cookieToken) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    return cookieToken;
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    const source = cookieHeader || "";
    const prefix = `${name}=`;

    for (const part of source.split(";")) {
      const value = part.trim();
      if (value.startsWith(prefix)) {
        return decodeURIComponent(value.slice(prefix.length));
      }
    }

    return null;
  }

  private buildSessionCookie(token: string): string {
    return `adminAccessToken=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`;
  }

  private clearSessionCookie(): string {
    return "adminAccessToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  }
}
