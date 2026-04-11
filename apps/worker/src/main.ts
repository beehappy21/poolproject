import { NestFactory } from "@nestjs/core";

import { WorkerAppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerAppModule);
  app.enableShutdownHooks();
  process.stdout.write("[worker] started\n");
}

void bootstrap().catch((error) => {
  process.stderr.write(
    `[worker] failed to start: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exit(1);
});
