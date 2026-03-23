import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../infrastructure";
import { PackagesController } from "./controllers/packages.controller";
import { ProductsController } from "./controllers/products.controller";
import { PrismaPackagesRepository } from "./repositories/packages.repository";
import { PackagesService } from "./services/packages.service";

@Module({
  imports: [PrismaModule],
  controllers: [PackagesController, ProductsController],
  providers: [PrismaPackagesRepository, PackagesService],
  exports: [PackagesService, PrismaPackagesRepository],
})
export class PackagesModule {}
