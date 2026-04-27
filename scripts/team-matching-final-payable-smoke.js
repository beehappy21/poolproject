const { PrismaClient } = require("@prisma/client");
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const ADMIN_IDENTIFIER = process.env.ADMIN_IDENTIFIER || "TH0000013";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "a1a1a1";
const SETTLEMENT_DATE = process.env.SETTLEMENT_DATE || "2030-01-15";
const DEFAULT_MATCHING_LEVEL_RATES = ["0.05", "0.05"];
const DEFAULT_TEAM_TWO_LEG_RATE = "0.3";
const PURCHASE_BASE = "500";
const EARNING_CAP = "100000";
const RUN_ID = crypto.randomBytes(4).toString("hex").toUpperCase();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readCommissionSetting(name, fallback) {
  try {
    const file = readFileSync(
      join(process.cwd(), "runtime", "commission-settings.json"),
      "utf8",
    );
    const parsed = JSON.parse(file);
    return parsed?.[name] ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function readMatchingLevelRates() {
  const configured = readCommissionSetting(
    "matchingLevelRates",
    DEFAULT_MATCHING_LEVEL_RATES,
  );
  return Array.isArray(configured) && configured.length > 0
    ? configured.filter((value) => typeof value === "string")
    : DEFAULT_MATCHING_LEVEL_RATES;
}

function readTeamTwoLegRate() {
  const configured = readCommissionSetting(
    "teamTwoLegRate",
    DEFAULT_TEAM_TWO_LEG_RATE,
  );
  return typeof configured === "string" && configured.trim().length > 0
    ? configured
    : DEFAULT_TEAM_TWO_LEG_RATE;
}

function toDecimalParts(value) {
  const normalized = String(value).trim();
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const scale = fraction.length;
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";

  return {
    negative,
    scale,
    units: BigInt(digits),
  };
}

function multiplyDecimalStrings(left, right) {
  const a = toDecimalParts(left);
  const b = toDecimalParts(right);
  const negative = a.negative !== b.negative;
  const units = a.units * b.units;
  const scale = a.scale + b.scale;
  const raw = units.toString().padStart(scale + 1, "0");
  const whole = scale === 0 ? raw : raw.slice(0, -scale) || "0";
  const fraction = scale === 0 ? "" : raw.slice(-scale).replace(/0+$/, "");
  const value = fraction ? `${whole}.${fraction}` : whole;
  return negative && value !== "0" ? `-${value}` : value;
}

async function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  const response = await new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
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
          resolve({
            statusCode: res.statusCode || 500,
            body: raw,
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

  const parsed = response.body ? JSON.parse(response.body) : null;

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(parsed?.message || `${response.statusCode} request failed for ${path}`);
  }

  return parsed;
}

async function loginAdmin() {
  const session = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
    },
  });

  return session.accessToken;
}

function createFixtureCode(label) {
  return `TM${label}${RUN_ID}`.slice(0, 20);
}

async function createFixtureUsers() {
  const activatedAt = new Date(`${SETTLEMENT_DATE}T00:00:00.000Z`);
  const activeUntil = new Date(`${SETTLEMENT_DATE}T23:59:59.999Z`);
  activeUntil.setUTCDate(activeUntil.getUTCDate() + 30);

  const root = await prisma.user.create({
    data: {
      memberCode: createFixtureCode("ROOT"),
      referralCode: createFixtureCode("RREF"),
      name: `Team Match Root ${RUN_ID}`,
      passwordHash: "smoke",
      sponsorId: null,
      memberProfile: {
        create: {},
      },
      packageCycles: {
        create: {
          cycleNo: 1,
          purchaseBase: PURCHASE_BASE,
          activatedAt,
          activeUntil,
          earningCap: EARNING_CAP,
          earnedTotalInCycle: "0",
          isReceivable: true,
          status: "ACTIVE",
          earningStatus: "ACTIVE",
        },
      },
    },
    select: { id: true, memberCode: true },
  });

  const level1 = await prisma.user.create({
    data: {
      memberCode: createFixtureCode("UP1"),
      referralCode: createFixtureCode("U1RF"),
      name: `Team Match Up1 ${RUN_ID}`,
      passwordHash: "smoke",
      sponsorId: root.id,
      memberProfile: {
        create: {},
      },
      packageCycles: {
        create: {
          cycleNo: 1,
          purchaseBase: PURCHASE_BASE,
          activatedAt,
          activeUntil,
          earningCap: EARNING_CAP,
          earnedTotalInCycle: "0",
          isReceivable: true,
          status: "ACTIVE",
          earningStatus: "ACTIVE",
        },
      },
    },
    select: { id: true, memberCode: true },
  });

  const teamUser = await prisma.user.create({
    data: {
      memberCode: createFixtureCode("TEAM"),
      referralCode: createFixtureCode("TMRF"),
      name: `Team Match Team ${RUN_ID}`,
      passwordHash: "smoke",
      sponsorId: level1.id,
      memberProfile: {
        create: {},
      },
      packageCycles: {
        create: {
          cycleNo: 1,
          purchaseBase: PURCHASE_BASE,
          activatedAt,
          activeUntil,
          earningCap: EARNING_CAP,
          earnedTotalInCycle: "0",
          isReceivable: true,
          status: "ACTIVE",
          earningStatus: "ACTIVE",
        },
      },
    },
    select: { id: true, memberCode: true },
  });

  const left = await prisma.user.create({
    data: {
      memberCode: createFixtureCode("LEFT"),
      referralCode: createFixtureCode("LFRF"),
      name: `Team Match Left ${RUN_ID}`,
      passwordHash: "smoke",
      sponsorId: teamUser.id,
      memberProfile: {
        create: {
          uplineUserId: teamUser.id,
          placementSide: "LEFT",
        },
      },
      packageCycles: {
        create: {
          cycleNo: 1,
          purchaseBase: PURCHASE_BASE,
          activatedAt,
          activeUntil,
          earningCap: EARNING_CAP,
          earnedTotalInCycle: "0",
          isReceivable: true,
          status: "ACTIVE",
          earningStatus: "ACTIVE",
        },
      },
    },
    select: { id: true, memberCode: true },
  });

  const right = await prisma.user.create({
    data: {
      memberCode: createFixtureCode("RGHT"),
      referralCode: createFixtureCode("RGRF"),
      name: `Team Match Right ${RUN_ID}`,
      passwordHash: "smoke",
      sponsorId: teamUser.id,
      memberProfile: {
        create: {
          uplineUserId: teamUser.id,
          placementSide: "RIGHT",
        },
      },
      packageCycles: {
        create: {
          cycleNo: 1,
          purchaseBase: PURCHASE_BASE,
          activatedAt,
          activeUntil,
          earningCap: EARNING_CAP,
          earnedTotalInCycle: "0",
          isReceivable: true,
          status: "ACTIVE",
          earningStatus: "ACTIVE",
        },
      },
    },
    select: { id: true, memberCode: true },
  });

  return { root, level1, teamUser, left, right };
}

async function cleanupFixture(users) {
  const userIds = Object.values(users).map((user) => user.id);

  await prisma.$transaction(async (tx) => {
    await tx.dailyCommissionCapUsage.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await tx.buybackEvent.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await tx.userBuybackProgress.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await tx.teamSettlementBatchItem.deleteMany({
      where: {
        batch: {
          settlementDate: new Date(`${SETTLEMENT_DATE}T00:00:00.000Z`),
        },
      },
    });

    await tx.teamSettlementBatch.deleteMany({
      where: {
        settlementDate: new Date(`${SETTLEMENT_DATE}T00:00:00.000Z`),
      },
    });

    await tx.commissionLedger.deleteMany({
      where: {
        OR: [
          { sourceUserId: { in: userIds } },
          { beneficiaryUserId: { in: userIds } },
        ],
      },
    });

    await tx.memberPackageCycle.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await tx.memberProfile.deleteMany({
      where: {
        userId: { in: userIds },
      },
    });

    await tx.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    });
  });
}

async function cleanupLeftoverFixtures() {
  const users = await prisma.user.findMany({
    where: {
      name: {
        startsWith: "Team Match ",
      },
    },
    select: {
      id: true,
      memberCode: true,
    },
  });

  if (users.length === 0) {
    return;
  }

  const byId = Object.fromEntries(
    users.map((user) => [user.memberCode, { id: user.id, memberCode: user.memberCode }]),
  );

  await cleanupFixture(byId);
}

async function main() {
  await request("/health");
  const token = await loginAdmin();
  const matchingLevelRates = readMatchingLevelRates();
  const teamTwoLegRate = readTeamTwoLegRate();
  let fixtureUsers = null;

  try {
    await cleanupLeftoverFixtures();
    fixtureUsers = await createFixtureUsers();

    await request(
      `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/scaffold`,
      {
        method: "POST",
        token,
      },
    );
    const processed = await request(
      `/commissions/team-settlement-batches/${SETTLEMENT_DATE}/process`,
      {
        method: "POST",
        token,
      },
    );

    const processedItem = processed.items.find(
      (item) =>
        item.userId === fixtureUsers.teamUser.id.toString() &&
        item.status === "processed",
    );

    assert(processedItem, "Fixture team user did not produce a processed team settlement item.");

    const teamCommission = await prisma.commissionLedger.findFirst({
      where: {
        sourceUserId: fixtureUsers.teamUser.id,
        beneficiaryUserId: fixtureUsers.teamUser.id,
        commissionType: "TEAM_2LEG",
        metadata: {
          path: ["teamSettlementBatchItemId"],
          equals: processedItem.itemId,
        },
      },
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        commissionType: true,
        grossAmount: true,
        finalPayableAmount: true,
        discardedAmount: true,
        commissionAmount: true,
        releaseStatus: true,
        status: true,
      },
    });

    assert(teamCommission, "No team commission ledger found for the fixture team item.");

    const expectedTeamAmount = multiplyDecimalStrings(PURCHASE_BASE, teamTwoLegRate);
    assert(
      teamCommission.commissionAmount.toString() === expectedTeamAmount,
      `Expected team commissionAmount=${expectedTeamAmount}, received ${teamCommission.commissionAmount.toString()}.`,
    );

    const matchingRows = await prisma.commissionLedger.findMany({
      where: {
        sourceCommissionLedgerId: teamCommission.id,
        commissionType: {
          in: ["MATCHING_L1", "MATCHING_L2"],
        },
      },
      orderBy: [{ levelNo: "asc" }, { id: "asc" }],
      select: {
        id: true,
        commissionType: true,
        levelNo: true,
        rate: true,
        basePv: true,
        commissionAmount: true,
        finalPayableAmount: true,
        sourceCommissionLedgerId: true,
        status: true,
      },
    });

    assert(
      matchingRows.length >= 2,
      `Expected at least 2 matching commission rows, found ${matchingRows.length}.`,
    );

    const teamFinalPayable = teamCommission.finalPayableAmount.toString();
    const verifiedRows = matchingRows.slice(0, 2).map((row, index) => {
      const expectedRate = matchingLevelRates[index] || row.rate.toString();
      const expectedAmount = multiplyDecimalStrings(teamFinalPayable, expectedRate);

      assert(
        row.basePv.toString() === teamFinalPayable,
        `Expected matching row ${row.id.toString()} basePv=${teamFinalPayable}, received ${row.basePv.toString()}.`,
      );
      assert(
        row.sourceCommissionLedgerId?.toString() === teamCommission.id.toString(),
        `Expected matching row ${row.id.toString()} to link back to team commission ${teamCommission.id.toString()}.`,
      );
      assert(
        row.commissionAmount.toString() === expectedAmount,
        `Expected matching row ${row.id.toString()} amount=${expectedAmount}, received ${row.commissionAmount.toString()}.`,
      );

      return {
        commissionId: row.id.toString(),
        commissionType: row.commissionType,
        levelNo: row.levelNo,
        rate: row.rate.toString(),
        basePv: row.basePv.toString(),
        commissionAmount: row.commissionAmount.toString(),
        finalPayableAmount: row.finalPayableAmount.toString(),
        status: row.status,
      };
    });

    console.log(
      JSON.stringify(
        {
          settlementDate: SETTLEMENT_DATE,
          fixtureRunId: RUN_ID,
          teamSettlementItemId: processedItem.itemId,
          teamCommission: {
            commissionId: teamCommission.id.toString(),
            commissionType: teamCommission.commissionType,
            grossAmount: teamCommission.grossAmount.toString(),
            commissionAmount: teamCommission.commissionAmount.toString(),
            finalPayableAmount: teamFinalPayable,
            discardedAmount: teamCommission.discardedAmount.toString(),
            releaseStatus: teamCommission.releaseStatus,
            status: teamCommission.status,
          },
          matchingRows: verifiedRows,
        },
        null,
        2,
      ),
    );
  } finally {
    if (fixtureUsers) {
      await cleanupFixture(fixtureUsers);
    }
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
