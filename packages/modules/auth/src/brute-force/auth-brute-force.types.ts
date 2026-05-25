export interface AuthBruteForceCheck {
  locked: boolean;
  retryAfterSeconds: number;
}

export interface AuthBruteForceStore {
  incrementFailure(key: string, windowSeconds: number): Promise<number>;
  clearFailures(key: string): Promise<void>;
  lock(key: string, durationSeconds: number): Promise<void>;
  getLock(key: string): Promise<AuthBruteForceCheck>;
}

export const AUTH_BRUTE_FORCE_STORE = Symbol("AUTH_BRUTE_FORCE_STORE");
