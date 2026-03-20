import { NestFactory } from "@nestjs/core";

import { ApiAppModule } from "./app.module";
import { apiConfig } from "./config/api.config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiAppModule);

  await app.listen(apiConfig.port);
}

void bootstrap();
