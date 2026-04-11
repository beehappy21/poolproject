export interface RedisConfig {
  url: string;
}

export const redisConfig: RedisConfig = {
  url: process.env.APP_REDIS_URL?.trim() || process.env.REDIS_URL?.trim() || "redis://localhost:6379",
};
