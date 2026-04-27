import { Controller, Get, Header, Headers } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSignupFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/signup", fileName), "utf8");
}

function readMemberAppFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/app", fileName), "utf8");
}

@Controller()
export class AdminUiController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getRoot() {
    return readSignupFile("index.html");
  }

  @Get("admin")
  @Header("Content-Type", "text/html; charset=utf-8")
  async getAdminRoot(
    @Headers("authorization") authorization?: string,
    @Headers("cookie") cookieHeader?: string,
  ) {
    void authorization;
    void cookieHeader;
    return this.renderDeprecatedAdminRedirect();
  }

  @Get("admin/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getAdminIndex() {
    return this.renderDeprecatedAdminRedirect();
  }

  @Get("admin/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getAdminStyles() {
    return "/* Deprecated admin UI. Use Orchid BAO at http://127.0.0.1:8001/admin/main */";
  }

  @Get("admin/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getAdminScript() {
    return "console.warn('Deprecated admin UI. Use Orchid BAO at http://127.0.0.1:8001/admin/main');";
  }

  @Get("signup")
  @Header("Content-Type", "text/html; charset=utf-8")
  getSignupRoot() {
    return readSignupFile("index.html");
  }

  @Get("signup/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getSignupIndex() {
    return readSignupFile("index.html");
  }

  @Get("signup/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getSignupStyles() {
    return readSignupFile("styles.css");
  }

  @Get("signup/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getSignupScript() {
    return readSignupFile("app.js");
  }

  @Get("app")
  @Header("Content-Type", "text/html; charset=utf-8")
  getMemberAppRoot() {
    return readMemberAppFile("index.html");
  }

  @Get("app/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getMemberAppIndex() {
    return readMemberAppFile("index.html");
  }

  @Get("app/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getMemberAppStyles() {
    return readMemberAppFile("styles.css");
  }

  @Get("app/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getMemberAppScript() {
    return readMemberAppFile("app.js");
  }

  private renderDeprecatedAdminRedirect(): string {
    const target = "http://127.0.0.1:8001/admin/main";

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin UI Moved</title>
  </head>
  <body>
    <p>Admin UI moved to <a href="${target}">${target}</a>.</p>
  </body>
</html>`;
  }
}
