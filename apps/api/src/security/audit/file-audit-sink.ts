import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import type { AuditLogConfig } from "./audit.config";

export class FileAuditSink {
  constructor(private readonly config: AuditLogConfig) {}

  write(line: string): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      mkdirSync(this.config.dir, { recursive: true });
      this.rotateIfNeeded(Buffer.byteLength(line, "utf8"));
      appendFileSync(this.pathFor(0), line, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown write error";
      console.warn(`Audit log write failed: ${message}`);
    }
  }

  private rotateIfNeeded(nextBytes: number): void {
    const currentPath = this.pathFor(0);
    if (!existsSync(currentPath)) {
      return;
    }

    const size = statSync(currentPath).size;
    if (size + nextBytes <= this.config.maxBytes) {
      return;
    }

    if (this.config.maxFiles <= 1) {
      unlinkSync(currentPath);
      return;
    }

    const oldestPath = this.pathFor(this.config.maxFiles - 1);
    if (existsSync(oldestPath)) {
      unlinkSync(oldestPath);
    }

    for (let index = this.config.maxFiles - 2; index >= 1; index -= 1) {
      const source = this.pathFor(index);
      if (existsSync(source)) {
        renameSync(source, this.pathFor(index + 1));
      }
    }

    renameSync(currentPath, this.pathFor(1));
  }

  private pathFor(index: number): string {
    if (index === 0) {
      return join(this.config.dir, this.config.file);
    }

    return join(this.config.dir, `${this.config.file}.${index}`);
  }
}
