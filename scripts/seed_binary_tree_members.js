const { randomBytes, scryptSync } = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const TREE_DEPTH = Number.parseInt(process.env.BINARY_TREE_DEPTH || "10", 10);
const ROOT_CODE = process.env.BINARY_TREE_ROOT_CODE || "TH0000001";
const PASSWORD = process.env.BINARY_TREE_MEMBER_PASSWORD || "a1a1a1";
const CODE_PREFIX = process.env.BINARY_TREE_CODE_PREFIX || "TH";
const CODE_WIDTH = Number.parseInt(process.env.BINARY_TREE_CODE_WIDTH || "7", 10);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function codeFor(index) {
  return `${CODE_PREFIX}${String(index).padStart(CODE_WIDTH, "0")}`;
}

function referralCodeFor(index) {
  return `R${String(index).padStart(Math.min(CODE_WIDTH, 7), "0")}`;
}

function buildTreeRows(depth) {
  const rows = [];
  let nextIndex = 1;
  let currentLevel = [{ index: nextIndex, sponsorIndex: null, level: 1 }];
  nextIndex += 1;

  for (let level = 1; level <= depth; level += 1) {
    const nextLevel = [];

    for (const node of currentLevel) {
      rows.push({
        index: node.index,
        memberCode: codeFor(node.index),
        sponsorCode: node.sponsorIndex ? codeFor(node.sponsorIndex) : null,
        level: node.level,
      });

      if (level < depth) {
        nextLevel.push(
          { index: nextIndex, sponsorIndex: node.index, level: level + 1 },
          { index: nextIndex + 1, sponsorIndex: node.index, level: level + 1 },
        );
        nextIndex += 2;
      }
    }

    currentLevel = nextLevel;
  }

  return rows;
}

async function upsertMember(input) {
  return prisma.user.upsert({
    where: { memberCode: input.memberCode },
    update: {
      referralCode: input.referralCode,
      name: input.name,
      passwordHash: input.passwordHash,
      sponsorId: input.sponsorId,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
      matrixPersonalPv: "0",
      matrixReentryEnabled: true,
    },
    create: {
      memberCode: input.memberCode,
      referralCode: input.referralCode,
      name: input.name,
      email: null,
      phone: null,
      passwordHash: input.passwordHash,
      sponsorId: input.sponsorId,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
      matrixPersonalPv: "0",
      matrixReentryEnabled: true,
    },
    select: {
      id: true,
      memberCode: true,
      sponsorId: true,
    },
  });
}

async function main() {
  if (!Number.isInteger(TREE_DEPTH) || TREE_DEPTH <= 0) {
    throw new Error("BINARY_TREE_DEPTH must be a positive integer.");
  }

  if (ROOT_CODE !== codeFor(1)) {
    throw new Error(
      `BINARY_TREE_ROOT_CODE must match the first generated code ${codeFor(1)}.`,
    );
  }

  const rows = buildTreeRows(TREE_DEPTH);
  const passwordHash = hashPassword(PASSWORD);
  const createdUsers = new Map();

  for (const row of rows) {
    const sponsor = row.sponsorCode ? createdUsers.get(row.sponsorCode) : null;
    const user = await upsertMember({
      memberCode: row.memberCode,
      referralCode: referralCodeFor(row.index),
      name: row.memberCode,
      passwordHash,
      sponsorId: sponsor ? sponsor.id : null,
    });
    createdUsers.set(row.memberCode, user);
  }

  const totalUsers = await prisma.user.count({
    where: {
      memberCode: {
        startsWith: CODE_PREFIX,
      },
    },
  });

  const deepestLevelCount = rows.filter((row) => row.level === TREE_DEPTH).length;

  console.log(
    JSON.stringify(
      {
        scenario: "binary_tree_members_only",
        rootCode: ROOT_CODE,
        depth: TREE_DEPTH,
        generatedMemberCount: rows.length,
        deepestLevelCount,
        memberCodeRange: {
          first: rows[0]?.memberCode ?? null,
          last: rows[rows.length - 1]?.memberCode ?? null,
        },
        totalUsersWithPrefix: totalUsers,
        password: PASSWORD,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
