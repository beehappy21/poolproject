import { Controller, Get, Header, Headers } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AuthService } from "../../../packages/modules/auth";

function readAdminFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/admin", fileName), "utf8");
}

function readSignupFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/signup", fileName), "utf8");
}

function readMemberAppFile(fileName: string): string {
  return readFileSync(join(process.cwd(), "apps/api/public/app", fileName), "utf8");
}

@Controller()
export class AdminUiController {
  constructor(private readonly authService: AuthService) {}

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
    const token = this.extractToken(authorization, cookieHeader);
    const user = token ? await this.authService.getSessionUser(token) : null;
    return user ? readAdminFile("index.html") : this.renderLoginShell();
  }

  @Get("admin/index.html")
  @Header("Content-Type", "text/html; charset=utf-8")
  getAdminIndex() {
    return readAdminFile("index.html");
  }

  @Get("admin/styles.css")
  @Header("Content-Type", "text/css; charset=utf-8")
  getAdminStyles() {
    return readAdminFile("styles.css");
  }

  @Get("admin/app.js")
  @Header("Content-Type", "application/javascript; charset=utf-8")
  getAdminScript() {
    return readAdminFile("app.js");
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

  private extractToken(authorization?: string, cookieHeader?: string): string | null {
    const normalized = (authorization || "").trim();

    if (normalized.toLowerCase().startsWith("bearer ")) {
      const token = normalized.slice(7).trim();
      return token || null;
    }

    const source = cookieHeader || "";
    const prefix = "adminAccessToken=";

    for (const part of source.split(";")) {
      const value = part.trim();
      if (value.startsWith(prefix)) {
        return decodeURIComponent(value.slice(prefix.length));
      }
    }

    return null;
  }

  private renderLoginShell(): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PoolProject Admin Login</title>
    <link rel="stylesheet" href="/admin/styles.css" />
  </head>
  <body data-admin-view="login">
    <div class="app-shell auth-shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">Internal Console</p>
          <h1>PoolProject Admin</h1>
        </div>
        <div class="session-card" id="sessionCard">
          <p class="muted">Sign in required</p>
        </div>
        <form class="login-form panel" id="loginForm">
          <label>
            <span>Member Code or Email</span>
            <input id="identifierInput" type="text" placeholder="ALICE or alice@example.com" required />
          </label>
          <label>
            <span>Password</span>
            <input id="passwordInput" type="password" placeholder="dev-password" required />
          </label>
          <button type="submit">Sign In</button>
          <p class="form-hint">Default dev login: <code>ALICE / dev-password</code></p>
        </form>
        <div class="panel action-panel">
          <button id="refreshButton" class="ghost">Check Session</button>
          <button id="logoutButton" class="ghost danger">Sign Out</button>
          <p class="muted" id="statusLine">Waiting for login</p>
        </div>
      </aside>
      <main class="content">
        <section class="hero panel">
          <div>
            <p class="eyebrow">Restricted Access</p>
            <h2>Sign in to open the admin console.</h2>
          </div>
          <div class="hero-badge">/admin</div>
        </section>
      </main>
    </div>
    <script src="/admin/app.js"></script>
  </body>
</html>`;
  }
}
