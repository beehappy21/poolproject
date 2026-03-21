import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function getRuntimePath(fileName: string): string {
  return join(process.cwd(), "runtime", fileName);
}

export function readRuntimeCollection<T>(fileName: string, fallback: T): T {
  try {
    const raw = readFileSync(getRuntimePath(fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeRuntimeCollection<T>(fileName: string, value: T): T {
  mkdirSync(join(process.cwd(), "runtime"), { recursive: true });
  writeFileSync(
    getRuntimePath(fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
  return value;
}
