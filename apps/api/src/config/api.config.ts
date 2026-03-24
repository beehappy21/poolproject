export interface ApiConfig {
  port: number;
  corsOrigins: string[];
}

const DEFAULT_CORS_ORIGINS = [
  "http://127.0.0.1:3001",
  "http://localhost:3001",
  "http://127.0.0.1:3002",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

function parseCorsOrigins(value?: string): string[] {
  if (!value?.trim()) {
    return DEFAULT_CORS_ORIGINS;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const apiConfig: ApiConfig = {
  port: 3000,
  corsOrigins: parseCorsOrigins(process.env.APP_CORS_ORIGINS),
};
