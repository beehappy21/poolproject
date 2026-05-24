import path from "node:path";

import {
  assertValidApiEnvironment,
  readEnvFile,
} from "./env.validation";

function main(): void {
  const fileArg = process.argv[2] || ".env.production.example";
  const targetPath = path.resolve(process.cwd(), fileArg);
  const env = readEnvFile(targetPath);

  try {
    assertValidApiEnvironment(env, { sourceName: targetPath });
    process.stdout.write(`[security:check-env] OK ${targetPath}\n`);
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }

    process.stderr.write("Unknown environment validation error.\n");
    process.exit(1);
  }
}

main();
