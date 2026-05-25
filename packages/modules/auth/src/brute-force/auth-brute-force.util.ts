import { createHash } from "node:crypto";

export function normalizeLoginIdentifier(identifier: string): string {
  return String(identifier || "").trim().toLowerCase();
}

export function hashLoginKeyPart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
