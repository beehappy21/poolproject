import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { ApiAppModule } from "./app.module";
import { apiConfig } from "./config/api.config";
import { assertValidApiEnvironment } from "./config/env.validation";
import { configureApiApp } from "./security/api-hardening";

async function bootstrap(): Promise<void> {
  assertValidApiEnvironment(process.env, { sourceName: "process.env" });
  const app = await NestFactory.create<NestExpressApplication>(ApiAppModule, {
    bodyParser: false,
  });
  await configureApiApp(app);

  await app.listen(apiConfig.port);
}

void bootstrap().catch((error) => {
  process.stderr.write(`[api] failed to start: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
