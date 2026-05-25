import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { writeSecurityAuditEntry } from "../../../../../apps/api/src/http/audit.util";
import { getAuthBruteForceConfig } from "./auth-brute-force.config";
import {
  AUTH_BRUTE_FORCE_STORE,
  type AuthBruteForceStore,
} from "./auth-brute-force.types";
import { hashLoginKeyPart, normalizeLoginIdentifier } from "./auth-brute-force.util";

export interface AuthLoginAttemptContext {
  identifier: string;
  ip?: string | null;
}

@Injectable()
export class AuthBruteForceService {
  private readonly config = getAuthBruteForceConfig();

  constructor(
    @Inject(AUTH_BRUTE_FORCE_STORE)
    private readonly store: AuthBruteForceStore,
  ) {}

  async assertCanAttemptLogin(context: AuthLoginAttemptContext): Promise<void> {
    const keys = this.keysFor(context);
    const locks = await Promise.all(keys.map((key) => this.store.getLock(key)));
    const activeLock = locks.find((lock) => lock.locked);

    if (activeLock) {
      writeSecurityAuditEntry({
        event: "auth.login.locked",
        at: new Date().toISOString(),
        ip: context.ip || null,
        identifierHash: this.identifierHash(context.identifier),
        retryAfterSeconds: activeLock.retryAfterSeconds,
      });
      throw new UnauthorizedException("Invalid credentials.");
    }
  }

  async recordFailedLogin(context: AuthLoginAttemptContext): Promise<void> {
    const keys = this.keysFor(context);
    const counts = await Promise.all(
      keys.map((key) => this.store.incrementFailure(key, this.config.failureWindowSeconds)),
    );
    const shouldLock = counts.some((count) => count >= this.config.maxFailures);

    writeSecurityAuditEntry({
      event: "auth.login.failed",
      at: new Date().toISOString(),
      ip: context.ip || null,
      identifierHash: this.identifierHash(context.identifier),
    });

    if (!shouldLock) {
      return;
    }

    await Promise.all(keys.map((key) => this.store.lock(key, this.config.lockDurationSeconds)));
    writeSecurityAuditEntry({
      event: "auth.login.lock.created",
      at: new Date().toISOString(),
      ip: context.ip || null,
      identifierHash: this.identifierHash(context.identifier),
      retryAfterSeconds: this.config.lockDurationSeconds,
    });
  }

  async recordSuccessfulLogin(context: AuthLoginAttemptContext): Promise<void> {
    await Promise.all(this.keysFor(context).map((key) => this.store.clearFailures(key)));
  }

  private keysFor(context: AuthLoginAttemptContext): string[] {
    const identifier = normalizeLoginIdentifier(context.identifier);
    const ip = String(context.ip || "unknown").trim().toLowerCase();

    return [
      `${this.config.keyPrefix}id:${hashLoginKeyPart(identifier)}`,
      `${this.config.keyPrefix}ip:${hashLoginKeyPart(ip)}`,
    ];
  }

  private identifierHash(identifier: string): string {
    return hashLoginKeyPart(normalizeLoginIdentifier(identifier));
  }
}
