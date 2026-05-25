import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";

import { LoginDto, TransferSlipDto } from "../../../../packages/modules/auth/src/dto";
import {
  createApiValidationPipe,
  createHelmetMiddleware,
  createRequestIdMiddleware,
  isCorsOriginAllowed,
  isUploadPayloadRequest,
} from "./api-hardening";

const expressBodyParsers = require("express") as {
  json: (options?: Record<string, unknown>) => any;
};

test("Helmet middleware sets key security headers", async () => {
  const headers = new Map<string, string | string[]>();
  const middleware = createHelmetMiddleware();
  const request: any = {
    method: "GET",
    headers: {},
  };
  const response = {
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    removeHeader(name: string) {
      headers.delete(name.toLowerCase());
    },
  };

  await new Promise<void>((resolve, reject) => {
    middleware(request as any, response as any, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});

test("ValidationPipe rejects unknown fields and invalid types", async () => {
  const pipe = createApiValidationPipe();
  const metadata = {
    type: "body" as const,
    metatype: LoginDto,
    data: "",
  };

  await assert.rejects(
    () =>
      pipe.transform(
        {
          identifier: "member@example.com",
          password: "correct-password",
          unexpected: true,
        },
        metadata,
      ),
    BadRequestException,
  );
  await assert.rejects(
    () =>
      pipe.transform(
        {
          identifier: 123,
          password: "correct-password",
        },
        metadata,
      ),
    BadRequestException,
  );
  const valid = await pipe.transform(
    {
      identifier: "member@example.com",
      password: "correct-password",
    },
    metadata,
  );

  assert.ok(valid instanceof LoginDto);
});

test("body parser rejects oversized JSON while accepting normal payloads", async () => {
  await assert.doesNotReject(() =>
    parseJsonBody({
      body: JSON.stringify({
        identifier: "member@example.com",
        password: "correct-password",
      }),
      limit: "1kb",
      path: "/dto",
    }),
  );
  await assert.rejects(
    () =>
      parseJsonBody({
        body: JSON.stringify({
          identifier: "member@example.com",
          password: "x".repeat(2048),
        }),
        limit: "1kb",
        path: "/dto",
      }),
    /request entity too large/i,
  );
});

test("transfer slip DTO rejects invalid MIME and accepts safe image data URL", async () => {
  const pipe = createApiValidationPipe();
  const metadata = {
    type: "body" as const,
    metatype: TransferSlipDto,
    data: "",
  };

  await assert.rejects(
    () =>
      pipe.transform(
        {
          transferSlipUrl: "data:text/html;base64,PHNjcmlwdD4=",
        },
        metadata,
      ),
    BadRequestException,
  );
  const valid = await pipe.transform(
    {
      transferSlipUrl: "data:image/png;base64,aGVsbG8=",
    },
    metadata,
  );

  assert.ok(valid instanceof TransferSlipDto);
});

test("upload route detection and CORS origin policy are restricted", () => {
  assert.equal(
    isUploadPayloadRequest({ path: "/auth/orders/1/submit-transfer-slip" }),
    true,
  );
  assert.equal(isUploadPayloadRequest({ path: "/auth/login" }), false);
  assert.equal(isCorsOriginAllowed("http://localhost:3001"), true);
  assert.equal(isCorsOriginAllowed("https://not-allowed.example"), false);
});

test("request id middleware preserves incoming id and returns response header", () => {
  const middleware = createRequestIdMiddleware();
  const request: any = {
    headers: {
      "x-request-id": "req-health-smoke",
    },
  };
  const headers: Record<string, string> = {};

  middleware(
    request,
    {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
    },
    () => undefined,
  );

  assert.equal(request.requestId, "req-health-smoke");
  assert.equal(headers["x-request-id"], "req-health-smoke");
});

async function parseJsonBody(input: {
  body: string;
  limit: string;
  path: string;
}): Promise<void> {
  const parser = expressBodyParsers.json({ limit: input.limit });
  const request = Readable.from([input.body]) as Readable & {
    headers: Record<string, string>;
    method: string;
    url: string;
    path: string;
    body?: unknown;
  };
  request.headers = {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(input.body).toString(),
  };
  request.method = "POST";
  request.url = input.path;
  request.path = input.path;

  const response = {
    setHeader() {},
    getHeader() {
      return undefined;
    },
    removeHeader() {},
  };

  await new Promise<void>((resolve, reject) => {
    parser(request as any, response as any, (error?: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
