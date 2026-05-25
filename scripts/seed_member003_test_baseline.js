#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { execFileSync } = require("node:child_process");

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const POSTGRES_CONTAINER =
  process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const POSTGRES_DB = process.env.POSTGRES_DB || "poolproject";
const POSTGRES_USER = process.env.POSTGRES_USER || "postgres";
const ADMIN_IDENTIFIER =
  process.env.BASELINE_ADMIN_IDENTIFIER || "dev-admin@example.com";
const ADMIN_PASSWORD = process.env.BASELINE_ADMIN_PASSWORD || "472121";
const INTERNAL_BAO_TOKEN = (process.env.INTERNAL_RECEIPT_TOKEN || "").trim();
const ROOT = path.resolve(__dirname, "..");
const RUNTIME_DIR = path.join(ROOT, "runtime");
const SOURCE_TAG =
  process.env.BASELINE_SOURCE_TAG || "commission-test-baseline";
const APPLY = process.argv.includes("--apply");

const SUPPLIER_CODE = "COMMTESTSUP";
const CATEGORY_CODE = "COMMTESTCAT";
const PRODUCT_CODE = "COMMTESTPROD";
const PRODUCT_DETAIL_CODE = "COMMTEST1000";
const PACKAGE_CODE = "COMMTESTPKG1000";
const PRODUCT_NAME = "test";
const PRODUCT_PRICE = "1000";
const PRODUCT_PV = "200";
const SECOND_PRODUCT_CODE = "COMMTESTPROD650";
const SECOND_PRODUCT_DETAIL_CODE = "COMMTEST650";
const SECOND_PACKAGE_CODE = "COMMTESTPKG650";
const SECOND_PRODUCT_NAME = "test 650";
const SECOND_PRODUCT_PRICE = "650";
const SECOND_PRODUCT_PV = "100";
const MAX_RATE_LIMIT_RETRIES = Number.parseInt(
  process.env.BASELINE_MAX_RATE_LIMIT_RETRIES || "20",
  10,
);

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function runPsql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      POSTGRES_CONTAINER,
      "psql",
      "-U",
      POSTGRES_USER,
      "-d",
      POSTGRES_DB,
      "-Atqc",
      sql,
    ],
    {
      encoding: "utf8",
      cwd: ROOT,
    },
  ).trim();
}

function writeJson(fileName, value) {
  ensureRuntimeDir();
  fs.writeFileSync(
    path.join(RUNTIME_DIR, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function writeText(fileName, value) {
  ensureRuntimeDir();
  fs.writeFileSync(path.join(RUNTIME_DIR, fileName), value, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function request(requestPath, options = {}) {
  const target = new URL(`${API_BASE_URL}${requestPath}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.internalBaoToken
            ? { "x-internal-bao-token": options.internalBaoToken }
            : {}),
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }

          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body: parsed,
          });
        });
      },
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function expectOk(requestPath, options = {}) {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await request(requestPath, options);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body;
    }

    if (response.statusCode === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfterHeader = Array.isArray(response.headers?.["retry-after"])
        ? response.headers?.["retry-after"]?.[0]
        : response.headers?.["retry-after"];
      const retryAfterSeconds = Number.parseInt(
        String(retryAfterHeader || "60"),
        10,
      );
      const delayMs = Math.max(
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60,
        1,
      ) * 1000;
      console.log(
        `[baseline] rate limited on ${options.method || "GET"} ${requestPath}; retrying in ${Math.round(delayMs / 1000)}s (${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
      );
      await sleep(delayMs);
      continue;
    }

    throw new Error(
      `${options.method || "GET"} ${requestPath} failed with ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
  }

  throw new Error(
    `${options.method || "GET"} ${requestPath} exhausted retries after repeated rate limiting.`,
  );
}

async function loginAdmin() {
  const response = await expectOk("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });
  return response.accessToken;
}

async function resolveApiAuth() {
  if (INTERNAL_BAO_TOKEN) {
    return {
      mode: "internal-bao-token",
      internalBaoToken: INTERNAL_BAO_TOKEN,
    };
  }

  return {
    mode: "bearer",
    token: await loginAdmin(),
  };
}

function parseMemberRows(raw) {
  if (!raw) {
    return [];
  }

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      const [userId, memberCode, name, signupDate, sponsorUserId] = line.split("|");
      return {
        originalOrder: index,
        userId,
        memberCode,
        name,
        originalSignupDate: signupDate,
        sponsorUserId: sponsorUserId || null,
      };
    });
}

function toBangkokSequencedIso(dateOnly, sequence = 1) {
  const minuteOffset = Math.max(0, Number(sequence || 1) - 1);
  const minute = String(minuteOffset % 60).padStart(2, "0");
  const hour = String(5 + Math.floor(minuteOffset / 60)).padStart(2, "0");
  return `${dateOnly}T${hour}:${minute}:00+07:00`;
}

function uniqueDatesInOrder(rows) {
  const seen = new Set();
  const ordered = [];
  for (const row of rows) {
    if (!seen.has(row.signupDate)) {
      seen.add(row.signupDate);
      ordered.push(row.signupDate);
    }
  }
  return ordered;
}

function buildDailyBatches(rows) {
  const batches = [];
  let current = null;

  for (const row of rows) {
    if (!current || current.signupDate !== row.signupDate) {
      current = {
        signupDate: row.signupDate,
        memberCount: 0,
        firstMemberCode: row.memberCode,
        lastMemberCode: row.memberCode,
        memberCodes: [],
      };
      batches.push(current);
    }

    current.memberCount += 1;
    current.lastMemberCode = row.memberCode;
    current.memberCodes.push(row.memberCode);
  }

  return batches;
}

function applyCommissionSequence(rows) {
  if (rows.length === 0) {
    return [];
  }

  const dateBuckets = [];
  for (const row of rows) {
    dateBuckets[row.originalSignupDate] = (dateBuckets[row.originalSignupDate] || 0) + 1;
  }

  const memberByUserId = new Map();
  const indegreeByUserId = new Map();
  const childrenByUserId = new Map();

  for (const row of rows) {
    memberByUserId.set(row.userId, row);
    indegreeByUserId.set(row.userId, 0);
    childrenByUserId.set(row.userId, []);
  }

  for (const row of rows) {
    if (!row.sponsorUserId || !memberByUserId.has(row.sponsorUserId)) {
      continue;
    }

    childrenByUserId.get(row.sponsorUserId).push(row.userId);
    indegreeByUserId.set(row.userId, (indegreeByUserId.get(row.userId) || 0) + 1);
  }

  const sortReady = (userIds) =>
    userIds.sort(
      (left, right) =>
        (memberByUserId.get(left)?.originalOrder || 0) -
        (memberByUserId.get(right)?.originalOrder || 0),
    );

  const readyUserIds = sortReady(
    rows
      .filter((row) => (indegreeByUserId.get(row.userId) || 0) === 0)
      .map((row) => row.userId),
  );

  const ordered = [];
  while (readyUserIds.length > 0) {
    const userId = readyUserIds.shift();
    const member = userId ? memberByUserId.get(userId) : null;
    if (!member) {
      continue;
    }

    ordered.push(member);
    for (const childUserId of childrenByUserId.get(userId) || []) {
      indegreeByUserId.set(childUserId, (indegreeByUserId.get(childUserId) || 0) - 1);
      if ((indegreeByUserId.get(childUserId) || 0) === 0) {
        readyUserIds.push(childUserId);
      }
    }
    sortReady(readyUserIds);
  }

  if (ordered.length < rows.length) {
    const orderedUserIds = new Set(ordered.map((row) => row.userId));
    for (const row of rows) {
      if (!orderedUserIds.has(row.userId)) {
        ordered.push(row);
      }
    }
  }

  const dateEntries = Object.entries(dateBuckets).map(([date, count]) => ({
    date,
    count,
  }));
  let dateIndex = 0;
  let slotUsage = 0;
  const daySequences = {};

  return ordered.map((row, index) => {
    while (dateEntries[dateIndex] && slotUsage >= dateEntries[dateIndex].count) {
      dateIndex += 1;
      slotUsage = 0;
    }

    const assignedDate = dateEntries[dateIndex]?.date || row.originalSignupDate;
    slotUsage += 1;
    daySequences[assignedDate] = (daySequences[assignedDate] || 0) + 1;

    return {
      ...row,
      sequence: index + 1,
      daySequence: daySequences[assignedDate],
      signupDate: assignedDate,
    };
  });
}

function fetchSingleValue(sql) {
  const raw = runPsql(sql);
  return raw ? raw.split("\n")[0] : "";
}

function ensureCatalog() {
  const existingDetailId = fetchSingleValue(
    `select id::text from "ProductDetail" where code = ${sqlLiteral(PRODUCT_DETAIL_CODE)} limit 1;`,
  );
  const existingPackageId = fetchSingleValue(
    `select id::text from "Package" where code = ${sqlLiteral(PACKAGE_CODE)} limit 1;`,
  );

  if (existingDetailId && existingPackageId) {
    return {
      productDetailId: existingDetailId,
      packageId: existingPackageId,
      created: false,
    };
  }

  const supplierId =
    fetchSingleValue(
      `select id::text from "Supplier" where code = ${sqlLiteral(SUPPLIER_CODE)} limit 1;`,
    ) ||
    fetchSingleValue(`
      insert into "Supplier" ("code", "name", "status", "createdAt", "updatedAt")
      values (
        ${sqlLiteral(SUPPLIER_CODE)},
        ${sqlLiteral("Commission Test Supplier")},
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const categoryId =
    fetchSingleValue(
      `select id::text from "ProductCategory" where "supplierId" = ${sqlLiteral(supplierId)}::bigint and code = ${sqlLiteral(CATEGORY_CODE)} limit 1;`,
    ) ||
    fetchSingleValue(`
      insert into "ProductCategory" (
        "supplierId",
        "code",
        "name",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(supplierId)}::bigint,
        ${sqlLiteral(CATEGORY_CODE)},
        ${sqlLiteral("Commission Test Category")},
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const productId =
    fetchSingleValue(
      `select id::text from "Product" where code = ${sqlLiteral(PRODUCT_CODE)} limit 1;`,
    ) ||
    fetchSingleValue(`
      insert into "Product" (
        "supplierId",
        "categoryId",
        "code",
        "name",
        "description",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(supplierId)}::bigint,
        ${sqlLiteral(categoryId)}::bigint,
        ${sqlLiteral(PRODUCT_CODE)},
        ${sqlLiteral(PRODUCT_NAME)},
        ${sqlLiteral("Commission baseline product 1000 THB / 200 PV")},
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const productDetailId =
    existingDetailId ||
    fetchSingleValue(`
      insert into "ProductDetail" (
        "productId",
        "code",
        "name",
        "shortDescription",
        "description",
        "memberPriceUsdt",
        "retailPriceUsdt",
        "costPriceUsdt",
        "pv",
        "poolRateMode",
        "poolRate",
        "poolCapMultiple",
        "commissionCapScope",
        "commissionCapMultiple",
        "activeDays",
        "earningCapAmount",
        "salesChannelMode",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(productId)}::bigint,
        ${sqlLiteral(PRODUCT_DETAIL_CODE)},
        ${sqlLiteral(PRODUCT_NAME)},
        ${sqlLiteral("1000 THB / 200 PV")},
        ${sqlLiteral("Commission baseline product 1000 THB / 200 PV")},
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        '400'::decimal,
        ${sqlLiteral(PRODUCT_PV)}::decimal,
        'DEFAULT_50_PERCENT',
        '0'::decimal,
        '0'::decimal,
        'ALL_COMMISSIONS',
        '0'::decimal,
        30,
        '10000'::decimal,
        'WAP_CATALOG',
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const packageId =
    existingPackageId ||
    fetchSingleValue(`
      insert into "Package" (
        "code",
        "name",
        "costPriceUsdt",
        "memberPriceUsdt",
        "retailPriceUsdt",
        "priceUsdt",
        "pv",
        "poolRateMode",
        "poolRate",
        "poolCapMultiple",
        "commissionCapScope",
        "commissionCapMultiple",
        "activeDays",
        "earningCapType",
        "earningCapAmount",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(PACKAGE_CODE)},
        ${sqlLiteral("test package")},
        '400'::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PV)}::decimal,
        'DEFAULT_50_PERCENT',
        '0'::decimal,
        '0'::decimal,
        'ALL_COMMISSIONS',
        '0'::decimal,
        30,
        'FIXED_AMOUNT',
        '10000'::decimal,
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const packageItemExists = fetchSingleValue(
    `select id::text from "PackageItem" where "packageId" = ${sqlLiteral(packageId)}::bigint and "productDetailId" = ${sqlLiteral(productDetailId)}::bigint limit 1;`,
  );
  if (!packageItemExists) {
    runPsql(`
      insert into "PackageItem" (
        "packageId",
        "productDetailId",
        "qty",
        "unitCostPriceUsdt",
        "unitMemberPriceUsdt",
        "unitRetailPriceUsdt",
        "unitPv",
        "unitPoolRate",
        "lineCostPriceUsdt",
        "lineMemberPriceUsdt",
        "lineRetailPriceUsdt",
        "linePv",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(packageId)}::bigint,
        ${sqlLiteral(productDetailId)}::bigint,
        1,
        '400'::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PV)}::decimal,
        '0'::decimal,
        '400'::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(PRODUCT_PV)}::decimal,
        now(),
        now()
      );
    `);
  }

  const existingSecondDetailId = fetchSingleValue(
    `select id::text from "ProductDetail" where code = ${sqlLiteral(SECOND_PRODUCT_DETAIL_CODE)} limit 1;`,
  );
  const existingSecondPackageId = fetchSingleValue(
    `select id::text from "Package" where code = ${sqlLiteral(SECOND_PACKAGE_CODE)} limit 1;`,
  );

  const secondProductId =
    fetchSingleValue(
      `select id::text from "Product" where code = ${sqlLiteral(SECOND_PRODUCT_CODE)} limit 1;`,
    ) ||
    fetchSingleValue(`
      insert into "Product" (
        "supplierId",
        "categoryId",
        "code",
        "name",
        "description",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(supplierId)}::bigint,
        ${sqlLiteral(categoryId)}::bigint,
        ${sqlLiteral(SECOND_PRODUCT_CODE)},
        ${sqlLiteral(SECOND_PRODUCT_NAME)},
        ${sqlLiteral("Commission baseline product 650 THB / 100 PV")},
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const secondProductDetailId =
    existingSecondDetailId ||
    fetchSingleValue(`
      insert into "ProductDetail" (
        "productId",
        "code",
        "name",
        "shortDescription",
        "description",
        "memberPriceUsdt",
        "retailPriceUsdt",
        "costPriceUsdt",
        "pv",
        "poolRateMode",
        "poolRate",
        "poolCapMultiple",
        "commissionCapScope",
        "commissionCapMultiple",
        "activeDays",
        "earningCapAmount",
        "salesChannelMode",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(secondProductId)}::bigint,
        ${sqlLiteral(SECOND_PRODUCT_DETAIL_CODE)},
        ${sqlLiteral(SECOND_PRODUCT_NAME)},
        ${sqlLiteral("650 THB / 100 PV")},
        ${sqlLiteral("Commission baseline product 650 THB / 100 PV")},
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        '260'::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PV)}::decimal,
        'DEFAULT_50_PERCENT',
        '0'::decimal,
        '0'::decimal,
        'ALL_COMMISSIONS',
        '0'::decimal,
        30,
        '5000'::decimal,
        'WAP_CATALOG',
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const secondPackageId =
    existingSecondPackageId ||
    fetchSingleValue(`
      insert into "Package" (
        "code",
        "name",
        "costPriceUsdt",
        "memberPriceUsdt",
        "retailPriceUsdt",
        "priceUsdt",
        "pv",
        "poolRateMode",
        "poolRate",
        "poolCapMultiple",
        "commissionCapScope",
        "commissionCapMultiple",
        "activeDays",
        "earningCapType",
        "earningCapAmount",
        "status",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(SECOND_PACKAGE_CODE)},
        ${sqlLiteral("test package 650")},
        '260'::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PV)}::decimal,
        'DEFAULT_50_PERCENT',
        '0'::decimal,
        '0'::decimal,
        'ALL_COMMISSIONS',
        '0'::decimal,
        30,
        'FIXED_AMOUNT',
        '5000'::decimal,
        'ACTIVE',
        now(),
        now()
      )
      returning id::text;
    `);

  const secondPackageItemExists = fetchSingleValue(
    `select id::text from "PackageItem" where "packageId" = ${sqlLiteral(secondPackageId)}::bigint and "productDetailId" = ${sqlLiteral(secondProductDetailId)}::bigint limit 1;`,
  );
  if (!secondPackageItemExists) {
    runPsql(`
      insert into "PackageItem" (
        "packageId",
        "productDetailId",
        "qty",
        "unitCostPriceUsdt",
        "unitMemberPriceUsdt",
        "unitRetailPriceUsdt",
        "unitPv",
        "unitPoolRate",
        "lineCostPriceUsdt",
        "lineMemberPriceUsdt",
        "lineRetailPriceUsdt",
        "linePv",
        "createdAt",
        "updatedAt"
      )
      values (
        ${sqlLiteral(secondPackageId)}::bigint,
        ${sqlLiteral(secondProductDetailId)}::bigint,
        1,
        '260'::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PV)}::decimal,
        '0'::decimal,
        '260'::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PRICE)}::decimal,
        ${sqlLiteral(SECOND_PRODUCT_PV)}::decimal,
        now(),
        now()
      );
    `);
  }

  return {
    productDetailId,
    packageId,
    secondProductDetailId,
    secondPackageId,
    created: true,
  };
}

function loadMembers() {
  return applyCommissionSequence(
    parseMemberRows(
    runPsql(`
      select
        u.id::text,
        u."memberCode",
        coalesce(u."name", ''),
        to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD'),
        u."sponsorId"::text
      from "User" u
      where u."isAdmin" = false
      order by
        to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') asc,
        u."memberCode" asc,
        u.id asc;
    `),
    ),
  );
}

function loadExistingOrders() {
  const rows = runPsql(`
    select
      o.id::text,
      o."orderNo",
      coalesce(o."shippingAddressNote", '')
    from "Order" o
    where o."shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
    order by o.id asc;
  `);

  const map = new Map();
  for (const line of rows.split("\n").filter(Boolean)) {
    const [orderId, orderNo, ...tagParts] = line.split("|");
    const tag = tagParts.join("|");
    map.set(tag, { orderId, orderNo });
  }
  return map;
}

function backfillOrderDates(orderId, userId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsql(`
    update "Order"
    set "updatedAt" = ${quoted}::timestamptz
    where id = ${sqlLiteral(orderId)}::bigint;

    update "OrderItem"
    set "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;

    update "CommissionLedger"
    set "commissionDate" = date(${quoted}::timestamptz at time zone 'Asia/Bangkok'),
        "evaluationAt" = ${quoted}::timestamptz,
        "finalizeCheckedAt" = coalesce("finalizeCheckedAt", ${quoted}::timestamptz),
        "finalizedAt" = coalesce("finalizedAt", ${quoted}::timestamptz),
        "releasedToWithdrawableAt" = case
          when "releasedToWithdrawableAt" is not null then ${quoted}::timestamptz
          else null
        end,
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;

    update "CompanyBonusLedger"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceRefId" = ${sqlLiteral(orderId)}::bigint;

    update "WalletTransaction"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where ("refType" = 'COMMISSION' and "refId" in (
      select id from "CommissionLedger" where "orderId" = ${sqlLiteral(orderId)}::bigint
    ))
       or ("refType" = 'ORDER' and "refId" = ${sqlLiteral(orderId)}::bigint);

    update "MatrixPayout"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint;

    update "MatrixAccumulationEvent"
    set "createdAt" = ${quoted}::timestamptz
    where "sourceOrderId" = ${sqlLiteral(orderId)}::bigint;

    update "MemberPackageCycle"
    set "activatedAt" = ${quoted}::timestamptz,
        "activeUntil" = ${quoted}::timestamptz + ("activeUntil" - "activatedAt"),
        "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where id in (
      select mpc.id
      from "MemberPackageCycle" mpc
      where mpc."userId" = ${sqlLiteral(userId)}::bigint
      order by mpc.id desc
      limit 1
    );
  `);
}

function prepareOrderForApprovedProcessing(orderId, approvedAtIso) {
  const quoted = sqlLiteral(approvedAtIso);
  runPsql(`
    update "Order"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz,
        "status" = 'APPROVED',
        "approvalStatus" = 'APPROVED',
        "paidAt" = coalesce("paidAt", ${quoted}::timestamptz),
        "approvedAt" = ${quoted}::timestamptz
    where id = ${sqlLiteral(orderId)}::bigint;

    update "OrderItem"
    set "createdAt" = ${quoted}::timestamptz,
        "updatedAt" = ${quoted}::timestamptz
    where "orderId" = ${sqlLiteral(orderId)}::bigint;
  `);
}

async function seedOrders({ members, productDetailId, auth }) {
  const existingOrders = loadExistingOrders();
  const createdOrders = [];

  for (const member of members) {
    const tag = `${SOURCE_TAG}|member=${member.memberCode}|signupDate=${member.signupDate}|seq=${member.sequence}`;
    const approvedAtIso = toBangkokSequencedIso(member.signupDate, member.sequence);
    const existing = existingOrders.get(tag);

    if (existing) {
      if (APPLY) {
        backfillOrderDates(existing.orderId, member.userId, approvedAtIso);
      }
      createdOrders.push({
        ...member,
        orderId: existing.orderId,
        orderNo: existing.orderNo,
        approvedAtIso,
        status: "existing",
      });
      continue;
    }

    if (!APPLY) {
      createdOrders.push({
        ...member,
        orderId: null,
        orderNo: null,
        approvedAtIso,
        status: "planned",
      });
      continue;
    }

    const orderCreatePath = auth.internalBaoToken ? "/internal/bao/orders" : "/orders";
    const created = await expectOk(orderCreatePath, {
      method: "POST",
      token: auth.token,
      internalBaoToken: auth.internalBaoToken,
      body: {
        userId: member.userId,
        productDetailId,
        quantity: "1",
        fulfillmentMethod: "branch_pickup",
        pickupBranchName: "Commission Test Baseline",
        pickupBranchNote: tag,
        pickupRecipientName: member.name || member.memberCode,
        pickupPhone: "0800000000",
        cashPaymentMethod: "bank_transfer",
      },
    });

    prepareOrderForApprovedProcessing(created.orderId, approvedAtIso);
    const processApprovedPath = auth.internalBaoToken
      ? `/internal/bao/orders/${created.orderId}/process-approved`
      : `/orders/${created.orderId}/process-approved`;
    await expectOk(processApprovedPath, {
      method: "POST",
      token: auth.token,
      internalBaoToken: auth.internalBaoToken,
    });
    backfillOrderDates(created.orderId, member.userId, approvedAtIso);

    createdOrders.push({
      ...member,
      orderId: created.orderId,
      orderNo: created.orderNo,
      approvedAtIso,
      status: "created",
    });
  }

  return createdOrders;
}

async function processEndOfDayByDate({ dates, auth }) {
  const results = [];
  for (const settlementDate of dates) {
    if (!APPLY) {
      results.push({
        settlementDate,
        status: "planned",
      });
      continue;
    }

    const processPath = auth.internalBaoToken
      ? `/internal/bao/commissions/end-of-day/${settlementDate}/process`
      : `/commissions/end-of-day/${settlementDate}/process`;
    const result = await expectOk(processPath, {
      method: "POST",
      token: auth.token,
      internalBaoToken: auth.internalBaoToken,
    });
    results.push({
      settlementDate,
      status: "processed",
      result,
    });
  }
  return results;
}

function loadDailySummary(members) {
  const memberIds = members
    .map((member) => sqlLiteral(member.userId))
    .join(", ");
  const rows = runPsql(`
    with order_daily as (
      select
        to_char((o."approvedAt" + interval '7 hour')::date, 'YYYY-MM-DD') as report_date,
        count(*) as order_count,
        count(distinct o."userId") as buyer_count,
        coalesce(sum(o."totalPv"), 0)::text as total_pv,
        coalesce(sum(o."totalUsdt"), 0)::text as total_amount
      from "Order" o
      where o."shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
        and o."approvedAt" is not null
      group by 1
    ),
    commission_daily as (
      select
        to_char(cl."commissionDate", 'YYYY-MM-DD') as report_date,
        coalesce(sum(case when cl."commissionType" = 'DIRECT' then cl."commissionAmount" else 0 end), 0)::text as direct_amount,
        coalesce(sum(case when cl."commissionType" = 'TEAM_2LEG' then cl."commissionAmount" else 0 end), 0)::text as team_2leg_amount,
        coalesce(sum(case when cl."commissionType" = 'TEAM_3LEG' then cl."commissionAmount" else 0 end), 0)::text as team_3leg_amount,
        coalesce(sum(case when cl."commissionType" = 'MATCHING_L1' then cl."commissionAmount" else 0 end), 0)::text as matching_l1_amount,
        coalesce(sum(case when cl."commissionType" = 'MATCHING_L2' then cl."commissionAmount" else 0 end), 0)::text as matching_l2_amount,
        coalesce(sum(case when cl."commissionType" = 'POOL' then cl."commissionAmount" else 0 end), 0)::text as pool_ledger_amount,
        count(*)::text as commission_row_count
      from "CommissionLedger" cl
      where cl."commissionDate" is not null
        and (
          cl."sourceUserId" in (${memberIds}) or
          cl."beneficiaryUserId" in (${memberIds}) or
          cl."orderId" in (
            select id from "Order" where "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
          )
        )
      group by 1
    ),
    fallback_daily as (
      select
        to_char((cbl."createdAt" + interval '7 hour')::date, 'YYYY-MM-DD') as report_date,
        coalesce(sum(cbl."amount"), 0)::text as company_fallback_amount
      from "CompanyBonusLedger" cbl
      where cbl."sourceRefId" in (
        select id from "Order" where "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
      )
      group by 1
    ),
    pool_daily as (
      select
        to_char(dpc."cycleDate", 'YYYY-MM-DD') as report_date,
        count(*)::text as pool_payout_count,
        count(*) filter (where dpp."commissionLedgerId" is not null)::text as linked_pool_payout_count,
        coalesce(sum(dpp."payoutAmount"), 0)::text as pool_payout_amount
      from "DailyPoolPayout" dpp
      join "DailyPoolCycle" dpc on dpc.id = dpp."cycleId"
      where dpc."cycleDate" in (
        select distinct (("approvedAt" + interval '7 hour')::date)
        from "Order"
        where "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
          and "approvedAt" is not null
      )
      group by 1
    )
    select
      dates.report_date,
      coalesce(od.order_count, 0)::text,
      coalesce(od.buyer_count, 0)::text,
      coalesce(od.total_pv, '0'),
      coalesce(od.total_amount, '0'),
      coalesce(cd.direct_amount, '0'),
      coalesce(cd.team_2leg_amount, '0'),
      coalesce(cd.team_3leg_amount, '0'),
      coalesce(cd.matching_l1_amount, '0'),
      coalesce(cd.matching_l2_amount, '0'),
      coalesce(cd.pool_ledger_amount, '0'),
      coalesce(cd.commission_row_count, '0'),
      coalesce(fd.company_fallback_amount, '0'),
      coalesce(pd.pool_payout_count, '0'),
      coalesce(pd.linked_pool_payout_count, '0'),
      coalesce(pd.pool_payout_amount, '0')
    from (
      select distinct to_char(("approvedAt" + interval '7 hour')::date, 'YYYY-MM-DD') as report_date
      from "Order"
      where "shippingAddressNote" like ${sqlLiteral(`${SOURCE_TAG}|%`)}
        and "approvedAt" is not null
    ) dates
    left join order_daily od on od.report_date = dates.report_date
    left join commission_daily cd on cd.report_date = dates.report_date
    left join fallback_daily fd on fd.report_date = dates.report_date
    left join pool_daily pd on pd.report_date = dates.report_date
    order by dates.report_date asc;
  `);

  return rows
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [
        reportDate,
        orderCount,
        buyerCount,
        totalPv,
        totalAmount,
        directAmount,
        team2LegAmount,
        team3LegAmount,
        matchingL1Amount,
        matchingL2Amount,
        poolLedgerAmount,
        commissionRowCount,
        companyFallbackAmount,
        poolPayoutCount,
        linkedPoolPayoutCount,
        poolPayoutAmount,
      ] = line.split("|");

      return {
        reportDate,
        orderCount: Number(orderCount),
        buyerCount: Number(buyerCount),
        totalPv,
        totalAmount,
        directAmount,
        team2LegAmount,
        team3LegAmount,
        matchingL1Amount,
        matchingL2Amount,
        poolLedgerAmount,
        commissionRowCount: Number(commissionRowCount),
        companyFallbackAmount,
        poolPayoutCount: Number(poolPayoutCount),
        linkedPoolPayoutCount: Number(linkedPoolPayoutCount),
        poolPayoutAmount,
      };
    });
}

function buildBaoSummary(dailySummary) {
  const totalPoolPayouts = dailySummary.reduce(
    (sum, row) => sum + row.poolPayoutCount,
    0,
  );
  const totalLinkedPoolPayouts = dailySummary.reduce(
    (sum, row) => sum + row.linkedPoolPayoutCount,
    0,
  );
  const hasUnlinkedPoolPayouts = totalPoolPayouts > totalLinkedPoolPayouts;

  const gaps = [];
  if (hasUnlinkedPoolPayouts) {
    gaps.push(
      "BAO pool report reads CommissionLedger type POOL, not DailyPoolPayout directly. Unlinked pool payouts or fallback-only pool outcomes may not appear on the BAO pool tab.",
    );
  }

  gaps.push(
    "BAO team report is grouped into one tab and combines TEAM_2LEG with TEAM_3LEG. It does not split 2-leg and 3-leg into separate screens.",
  );
  gaps.push(
    "BAO matching report is grouped into one tab and combines MATCHING_L1 with MATCHING_L2. It does not split matching levels into separate screens.",
  );
  gaps.push(
    "Company fallback rows are not exposed as a first-class BAO commission tab. They need runtime summary or raw DB inspection when fallback happens.",
  );

  return {
    overview: {
      direct: "supported",
      team: "supported-grouped",
      matching: "supported-grouped",
      pool: hasUnlinkedPoolPayouts ? "partial" : "supported-when-pooled-ledgers-exist",
    },
    gaps,
  };
}

function buildMarkdownReport(payload) {
  const lines = [
    "# Commission Test Baseline",
    "",
    `- apply: \`${payload.apply}\``,
    `- members: \`${payload.memberCount}\``,
    `- unique signup days: \`${payload.uniqueSignupDayCount}\``,
    `- product: \`${PRODUCT_NAME}\` \`${PRODUCT_PRICE} THB\` \`${PRODUCT_PV} PV\``,
    `- extra product: \`${SECOND_PRODUCT_NAME}\` \`${SECOND_PRODUCT_PRICE} THB\` \`${SECOND_PRODUCT_PV} PV\``,
    `- source tag: \`${SOURCE_TAG}\``,
    "",
    "## Daily Summary",
    "",
    "| Date | Orders | Buyers | PV | Direct | Team 2leg | Team 3leg | Matching L1 | Matching L2 | Pool Ledger | Pool Payouts | Fallback |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...payload.dailySummary.map(
      (row) =>
        `| ${row.reportDate} | ${row.orderCount} | ${row.buyerCount} | ${row.totalPv} | ${row.directAmount} | ${row.team2LegAmount} | ${row.team3LegAmount} | ${row.matchingL1Amount} | ${row.matchingL2Amount} | ${row.poolLedgerAmount} | ${row.poolPayoutAmount} (${row.poolPayoutCount}) | ${row.companyFallbackAmount} |`,
    ),
    "",
    "## BAO Coverage",
    "",
    `- direct: ${payload.bao.overview.direct}`,
    `- team: ${payload.bao.overview.team}`,
    `- matching: ${payload.bao.overview.matching}`,
    `- pool: ${payload.bao.overview.pool}`,
    "",
    "## BAO Gaps",
    "",
    ...payload.bao.gaps.map((gap) => `- ${gap}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

async function main() {
  await expectOk("/health");

  const members = loadMembers();
  const dailyBatches = buildDailyBatches(members);
  const directAtLeastThree = fetchSingleValue(`
    select count(*)
    from (
      select u.id
      from "User" u
      join "User" s on s."sponsorId" = u.id and s."isAdmin" = false
      where u."isAdmin" = false
      group by u.id
      having count(s.id) >= 3
    ) direct_three;
  `);

  const catalog = ensureCatalog();
  const uniqueDates = uniqueDatesInOrder(members);

  const plan = {
    ok: true,
    apply: APPLY,
    memberCount: members.length,
    uniqueSignupDayCount: uniqueDates.length,
    directAtLeastThreeCount: Number(directAtLeastThree || "0"),
    catalog,
    firstMembers: members.slice(0, 10),
    dailyBatches,
  };

  if (!APPLY) {
    writeJson("commission-test-baseline-plan.json", plan);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const auth = await resolveApiAuth();
  const createdOrders = await seedOrders({
    members,
    productDetailId: catalog.productDetailId,
    auth,
  });
  const endOfDayRuns = await processEndOfDayByDate({
    dates: uniqueDates,
    auth,
  });
  const dailySummary = loadDailySummary(members);
  const bao = buildBaoSummary(dailySummary);

  const payload = {
    ...plan,
    createdOrdersSummary: {
      created: createdOrders.filter((row) => row.status === "created").length,
      existing: createdOrders.filter((row) => row.status === "existing").length,
    },
    endOfDaySummary: {
      processed: endOfDayRuns.filter((row) => row.status === "processed").length,
    },
    dailySummary,
    bao,
  };

  writeJson("commission-test-baseline-result.json", payload);
  writeText("commission-test-baseline-result.md", buildMarkdownReport(payload));
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
