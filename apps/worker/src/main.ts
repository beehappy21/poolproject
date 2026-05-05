import { NestFactory } from "@nestjs/core";

import { WorkerAppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerAppModule);
  app.enableShutdownHooks();

  let shuttingDown = false;

  const keepAlive = setInterval(() => {
    // Keep the worker event loop alive while background providers run.
  }, 60_000);

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.stdout.write(`[worker] received ${signal}, shutting down\n`);

    clearInterval(keepAlive);
    await app.close();
    process.exit(0);
  };

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.stdout.write("[worker] started\n");
}

void bootstrap().catch((error) => {
  process.stderr.write(
    `[worker] failed to start: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exit(1);
});
