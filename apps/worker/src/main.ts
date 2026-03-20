import { NestFactory } from "@nestjs/core";

import { WorkerAppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerAppModule);
  process.stdout.write("[worker] started\n");
}

void bootstrap();
