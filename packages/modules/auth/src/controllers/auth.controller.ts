import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
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
  ) {
    return this.authService.login({
      identifier: requireNonEmptyString(body.identifier, "identifier"),
      password: requireNonEmptyString(body.password, "password"),
    });
  }

  @Get("me")
  async me(@Headers("authorization") authorization?: string) {
    const token = this.extractToken(authorization);
    const user = await this.authService.getSessionUser(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    return { user };
  }

  @Post("logout")
  async logout(@Headers("authorization") authorization?: string) {
    const token = this.extractToken(authorization);
    await this.authService.logout(token);
    return { success: true };
  }

  private extractToken(authorization?: string): string {
    const normalized = (authorization || "").trim();

    if (!normalized.toLowerCase().startsWith("bearer ")) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    const token = normalized.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    return token;
  }
}
