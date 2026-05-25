import type {
  AuthBruteForceCheck,
  AuthBruteForceStore,
} from "./auth-brute-force.types";

interface Counter {
  count: number;
  expiresAt: number;
}

export class InMemoryAuthBruteForceStore implements AuthBruteForceStore {
  private readonly counters = new Map<string, Counter>();
  private readonly locks = new Map<string, number>();

  async incrementFailure(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const current = this.counters.get(key);
    const counter = !current || current.expiresAt <= now
      ? { count: 1, expiresAt: now + windowSeconds * 1000 }
      : { count: current.count + 1, expiresAt: current.expiresAt };

    this.counters.set(key, counter);
    return counter.count;
  }

  async clearFailures(key: string): Promise<void> {
    this.counters.delete(key);
    this.locks.delete(key);
  }

  async lock(key: string, durationSeconds: number): Promise<void> {
    this.locks.set(key, Date.now() + durationSeconds * 1000);
  }

  async getLock(key: string): Promise<AuthBruteForceCheck> {
    const expiresAt = this.locks.get(key) || 0;
    const now = Date.now();

    if (expiresAt <= now) {
      this.locks.delete(key);
      return { locked: false, retryAfterSeconds: 0 };
    }

    return {
      locked: true,
      retryAfterSeconds: Math.max(Math.ceil((expiresAt - now) / 1000), 1),
    };
  }
}
