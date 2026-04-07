import { createServer, request as httpRequest } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { request as httpsRequest } from "node:https";

const rootDir = resolve(process.argv[2] || ".");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || "3002");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

const indexHtml = readFileSync(join(rootDir, "index.html"));
const apiProxyTarget = new URL(process.env.STEPHUB_API_PROXY_TARGET || "http://127.0.0.1:3000");
const baoProxyTarget = new URL(process.env.STEPHUB_BAO_PROXY_TARGET || "http://127.0.0.1:8001");

const isHashedAsset = (pathname) =>
  /\/static\/.+\.[0-9a-f]{8,}\./i.test(pathname);

const sendBuffer = (response, statusCode, body, contentType, cacheControl) => {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });
  response.end(body);
};

const sendFile = (response, filePath, pathname) => {
  const extension = extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";
  const cacheControl = extension === ".html"
    ? "no-store, no-cache, must-revalidate"
    : "no-store, no-cache, must-revalidate";

  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": statSync(filePath).size,
    "Cache-Control": cacheControl,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });

  createReadStream(filePath).pipe(response);
};

const pipeProxyResponse = (upstreamResponse, response) => {
  response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
  upstreamResponse.pipe(response);
};

const proxyRequest = (request, response, pathname, targetBaseUrl, stripPrefix) => {
  const targetUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const upstreamPath = `${pathname.replace(stripPrefix, "") || "/"}${targetUrl.search}`;
  const transport = targetBaseUrl.protocol === "https:" ? httpsRequest : httpRequest;

  const upstreamRequest = transport(
    {
      protocol: targetBaseUrl.protocol,
      hostname: targetBaseUrl.hostname,
      port: targetBaseUrl.port,
      method: request.method,
      path: upstreamPath,
      headers: {
        ...request.headers,
        host: targetBaseUrl.host,
        "x-forwarded-host": request.headers.host || "",
        "x-forwarded-proto": "https",
      },
    },
    (upstreamResponse) => pipeProxyResponse(upstreamResponse, response),
  );

  upstreamRequest.on("error", (error) => {
    sendBuffer(
      response,
      502,
      JSON.stringify({
        message: `Proxy request failed for ${upstreamPath}.`,
        error: String(error),
      }),
      "application/json; charset=utf-8",
      "no-store",
    );
  });

  request.pipe(upstreamRequest);
};

createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname.startsWith("/api/")) {
    proxyRequest(request, response, pathname, apiProxyTarget, "/api");
    return;
  }

  if (pathname.startsWith("/bao-api/")) {
    proxyRequest(request, response, pathname, baoProxyTarget, "/bao-api");
    return;
  }

  if (pathname.startsWith("/storage/")) {
    proxyRequest(request, response, pathname, baoProxyTarget, "");
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "no-store",
    });
    response.end();
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Cache-Control": "no-store" });
    response.end();
    return;
  }

  const normalizedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const relativePath =
    normalizedPath === "/"
      ? "index.html"
      : normalizedPath.replace(/^\/+/, "");
  const filePath = resolve(join(rootDir, relativePath));

  if (filePath.startsWith(rootDir) && existsSync(filePath) && statSync(filePath).isFile()) {
    if (request.method === "HEAD") {
      const extension = extname(filePath).toLowerCase();
      const contentType = mimeTypes[extension] || "application/octet-stream";
      const cacheControl = extension === ".html"
        ? "no-store, no-cache, must-revalidate"
        : "no-store, no-cache, must-revalidate";

      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": statSync(filePath).size,
        "Cache-Control": cacheControl,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
      });
      response.end();
      return;
    }

    sendFile(response, filePath, pathname);
    return;
  }

  sendBuffer(
    response,
    200,
    request.method === "HEAD" ? undefined : indexHtml,
    "text/html; charset=utf-8",
    "no-store, no-cache, must-revalidate",
  );
}).listen(port, host, () => {
  console.log(`Stephub build server listening on http://${host}:${port}`);
});
