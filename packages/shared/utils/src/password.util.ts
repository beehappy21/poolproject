import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt$";
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = deriveKey(password, salt).toString("hex");
  return `${HASH_PREFIX}${salt}$${hash}`;
}

export function isHashedPassword(value: string): boolean {
  return value.startsWith(HASH_PREFIX);
}

export function verifyPassword(password: string, storedValue: string): boolean {
  if (!isHashedPassword(storedValue)) {
    return password === storedValue;
  }

  const [, salt, hash] = storedValue.split("$");

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = deriveKey(password, salt);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
