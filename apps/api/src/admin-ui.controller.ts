import { Controller, Get, Header } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readAdminFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/admin", fileName), "utf8");
}

@Controller("admin")
export class AdminUiController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getAdminRoot() {
    return readAdminFile("index.html");
  }

  @Get("index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getAdminIndex() {
    return readAdminFile("index.html");
  }

  @Get("styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getAdminStyles() {
    return readAdminFile("styles.css");
  }

  @Get("app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getAdminScript() {
    return readAdminFile("app.js");
  }
}
