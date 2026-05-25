export interface RateLimitProfile {
  name: string;
  windowSeconds: number;
  maxRequests: number;
  sensitive?: boolean;
}

export interface RateLimitHit {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  increment(key: string, windowSeconds: number, maxRequests: number): Promise<RateLimitHit>;
}

export interface RateLimitRequestLike {
  method?: string;
  path?: string;
  originalUrl?: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
  body?: {
    identifier?: unknown;
    password?: unknown;
    token?: unknown;
  };
}

export interface RateLimitResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}
