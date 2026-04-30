import { Controller, Get, GoneException, Header, Headers } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readAdminHtmlFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/admin", fileName), "utf8");
}

function readArchivedAdminAsset(fileName: string): string {
  return readFileSync(
    join(process.cwd(), "tmp/archived_admin_ui_2026-04-28/admin", fileName),
    "utf8",
  );
}

@Controller()
export class AdminUiController {
  private getDisabledUiMessage(path: string): never {
    throw new GoneException({
      message: `The UI at ${path} is disabled. Use /admin for BAO admin or the Stephub WAP app instead.`,
    });
  }

  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getRoot() {
    return readAdminHtmlFile("index.html");
  }

  @Get("admin")
  @Header("Content-Type", "text/html; charset=utf-8")
  async getAdminRoot(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    void authorization;
    void cookieHeader;
    return readAdminHtmlFile("index.html");
  }

  @Get("admin/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getAdminIndex() {
    return readAdminHtmlFile("index.html");
  }

  @Get("admin/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getAdminStyles() {
    return readArchivedAdminAsset("styles.css");
  }

  @Get("admin/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getAdminScript() {
    return readArchivedAdminAsset("app.js");
  }

  @Get("signup")
  @Header("Content-Type", "text/html; charset=utf-8")
  getSignupRoot() {
    return this.getDisabledUiMessage("/signup");
  }

  @Get("signup/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getSignupIndex() {
    return this.getDisabledUiMessage("/signup/index.html");
  }

  @Get("signup/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getSignupStyles() {
    return this.getDisabledUiMessage("/signup/styles.css");
  }

  @Get("signup/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getSignupScript() {
    return this.getDisabledUiMessage("/signup/app.js");
  }

  @Get("app")
  @Header("Content-Type", "text/html; charset=utf-8")
  getMemberAppRoot() {
    return this.getDisabledUiMessage("/app");
  }

  @Get("app/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getMemberAppIndex() {
    return this.getDisabledUiMessage("/app/index.html");
  }

  @Get("app/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getMemberAppStyles() {
    return this.getDisabledUiMessage("/app/styles.css");
  }

  @Get("app/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getMemberAppScript() {
    return this.getDisabledUiMessage("/app/app.js");
  }
}
