const { randomBytes, randomInt, scryptSync } = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const TARGET_TOTAL = Number.parseInt(process.env.RANDOM_MEMBER_TARGET_TOTAL || "1000", 10);
const PASSWORD = process.env.RANDOM_MEMBER_PASSWORD || "a1a1a1";
const CODE_PREFIX = process.env.RANDOM_MEMBER_CODE_PREFIX || "TH";
const CODE_WIDTH = Number.parseInt(process.env.RANDOM_MEMBER_CODE_WIDTH || "7", 10);
const APPLY = process.argv.includes("--apply");
const BUCKET_WEIGHTS = {
  zero: Number.parseFloat(process.env.RANDOM_MEMBER_WEIGHT_ZERO || "0.46"),
  one: Number.parseFloat(process.env.RANDOM_MEMBER_WEIGHT_ONE || "0.18"),
  two: Number.parseFloat(process.env.RANDOM_MEMBER_WEIGHT_TWO || "0.18"),
  many: Number.parseFloat(process.env.RANDOM_MEMBER_WEIGHT_MANY || "0.18"),
};
const MANY_MIN = Number.parseInt(process.env.RANDOM_MEMBER_MANY_MIN || "3", 10);
const MANY_MAX = Number.parseInt(process.env.RANDOM_MEMBER_MANY_MAX || "6", 10);

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

function bucketForDirectCount(directCount) {
  if (directCount <= 0) {
    return "zero";
  }
  if (directCount === 1) {
    return "one";
  }
  if (directCount === 2) {
    return "two";
  }
  return "many";
}

function weightedChoice(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return items[randomInt(items.length)]?.value ?? null;
  }

  let cursor = Math.random() * totalWeight;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1]?.value ?? null;
}

function countBuckets(records) {
  const summary = { zero: 0, one: 0, two: 0, many: 0 };
  for (const record of records) {
    summary[bucketForDirectCount(record.directCount)] += 1;
  }
  return summary;
}

function toDirectBucketSummary(summary) {
  return {
    zero: summary.zero,
    one: summary.one,
    two: summary.two,
    moreThanTwo: summary.many,
  };
}

function pickSponsor(records) {
  const eligible = records.filter((record) => record.remainingChildren > 0);
  if (eligible.length === 0) {
    return null;
  }

  return weightedChoice(
    eligible.map((record) => ({
      value: record,
      weight: Math.max(1, record.remainingChildren),
    })),
  );
}

function sampleTargetChildren() {
  const bucket = weightedChoice([
    { value: "zero", weight: BUCKET_WEIGHTS.zero },
    { value: "one", weight: BUCKET_WEIGHTS.one },
    { value: "two", weight: BUCKET_WEIGHTS.two },
    { value: "many", weight: BUCKET_WEIGHTS.many },
  ]);

  if (bucket === "zero") {
    return 0;
  }
  if (bucket === "one") {
    return 1;
  }
  if (bucket === "two") {
    return 2;
  }

  return randomInt(MANY_MIN, MANY_MAX + 1);
}

async function createMemberNow(input) {
  return prisma.user.create({
    data: {
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
    },
  });
}

async function main() {
  if (!Number.isInteger(TARGET_TOTAL) || TARGET_TOTAL <= 0) {
    throw new Error("RANDOM_MEMBER_TARGET_TOTAL must be a positive integer.");
  }

  const existingUsers = await prisma.user.findMany({
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      memberCode: true,
      directReferrals: {
        select: { id: true },
      },
    },
  });

  const existingCount = existingUsers.length;
  const nextToCreate = Math.max(TARGET_TOTAL - existingCount, 0);
  const passwordHash = hashPassword(PASSWORD);
  const records = existingUsers.map((user) => ({
    id: user.id,
    memberCode: user.memberCode,
    directCount: user.directReferrals.length,
    targetChildren: user.directReferrals.length,
    remainingChildren: 0,
  }));
  const beforeBuckets = countBuckets(records);
  const availableNewChildren = nextToCreate;

  for (const record of records) {
    const sampledTarget = sampleTargetChildren();
    record.targetChildren = Math.max(record.directCount, sampledTarget);
    record.remainingChildren = Math.max(0, record.targetChildren - record.directCount);
  }

  const maxExistingCode = existingUsers.reduce((maxValue, user) => {
    const match = user.memberCode.match(new RegExp(`^${CODE_PREFIX}(\\d+)$`));
    if (!match) {
      return maxValue;
    }
    return Math.max(maxValue, Number.parseInt(match[1], 10));
  }, 0);

  let nextIndex = maxExistingCode + 1;
  const plannedMembers = [];
  let remainingSlots = availableNewChildren;

  for (let created = 0; created < nextToCreate; created += 1) {
    const sponsor = pickSponsor(records);
    const memberCode = codeFor(nextIndex);
    const referralCode = referralCodeFor(nextIndex);
    const targetChildren = sampleTargetChildren();
    const boundedTargetChildren = Math.min(targetChildren, Math.max(0, remainingSlots - 1));

    let createdUser = null;
    if (APPLY) {
      createdUser = await createMemberNow({
        memberCode,
        referralCode,
        name: memberCode,
        sponsorId: sponsor?.id ?? null,
        passwordHash,
      });
    }

    plannedMembers.push({
      index: nextIndex,
      memberCode,
      referralCode,
      name: memberCode,
      sponsorId: sponsor?.id ?? null,
      sponsorCode: sponsor?.memberCode ?? null,
      passwordHash,
      targetChildren: boundedTargetChildren,
    });

    if (sponsor) {
      sponsor.directCount += 1;
      sponsor.remainingChildren = Math.max(0, sponsor.remainingChildren - 1);
    }

    remainingSlots -= 1;
    records.push({
      id: createdUser?.id ?? null,
      memberCode,
      directCount: 0,
      targetChildren: boundedTargetChildren,
      remainingChildren: boundedTargetChildren,
    });

    nextIndex += 1;
  }

  const afterBuckets = countBuckets(records);

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        password: PASSWORD,
        existingCount,
        targetTotal: TARGET_TOTAL,
        plannedNewMembers: plannedMembers.length,
        memberCodeRange:
          plannedMembers.length > 0
            ? {
                first: plannedMembers[0].memberCode,
                last: plannedMembers[plannedMembers.length - 1].memberCode,
              }
            : null,
        directBucketsBefore: toDirectBucketSummary(beforeBuckets),
        directBucketsAfter: toDirectBucketSummary(afterBuckets),
        sampleNewMembers: plannedMembers.slice(0, 12).map((member) => ({
          memberCode: member.memberCode,
          sponsorCode: member.sponsorCode,
        })),
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
