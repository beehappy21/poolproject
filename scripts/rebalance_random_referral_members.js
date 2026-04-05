const { randomInt } = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

const CODE_PREFIX = process.env.RANDOM_MEMBER_CODE_PREFIX || "TH";
const CODE_WIDTH = Number.parseInt(process.env.RANDOM_MEMBER_CODE_WIDTH || "7", 10);
const START_INDEX = Number.parseInt(process.env.RANDOM_MEMBER_REBALANCE_START || "211", 10);
const END_INDEX = Number.parseInt(process.env.RANDOM_MEMBER_REBALANCE_END || "1000", 10);
const APPLY = process.argv.includes("--apply");

function codeFor(index) {
  return `${CODE_PREFIX}${String(index).padStart(CODE_WIDTH, "0")}`;
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
  const candidates = records.filter((record) => record.directCount <= 2);
  if (candidates.length === 0) {
    return records[randomInt(records.length)] ?? null;
  }
  return candidates[randomInt(candidates.length)] ?? null;
}

async function main() {
  const targetCodes = [];
  for (let index = START_INDEX; index <= END_INDEX; index += 1) {
    targetCodes.push(codeFor(index));
  }

  const users = await prisma.user.findMany({
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      memberCode: true,
      sponsorId: true,
      directReferrals: {
        select: { id: true },
      },
    },
  });

  const records = users.map((user) => ({
    id: user.id,
    memberCode: user.memberCode,
    sponsorId: user.sponsorId,
    directCount: user.directReferrals.length,
  }));
  const byCode = new Map(records.map((record) => [record.memberCode, record]));
  const targetMembers = targetCodes
    .map((code) => byCode.get(code))
    .filter(Boolean);

  const beforeBuckets = countBuckets(records);
  const updates = [];

  for (const target of targetMembers) {
    if (target.sponsorId) {
      continue;
    }

    const sponsor = pickSponsor(records.filter((record) => record.id !== target.id));
    if (!sponsor) {
      continue;
    }

    updates.push({
      memberCode: target.memberCode,
      sponsorCode: sponsor.memberCode,
      sponsorId: sponsor.id,
    });

    target.sponsorId = sponsor.id;
    sponsor.directCount += 1;
  }

  if (APPLY) {
    for (const update of updates) {
      await prisma.user.update({
        where: { memberCode: update.memberCode },
        data: { sponsorId: update.sponsorId },
      });
    }
  }

  const afterRecords = records.map((record) => ({
    ...record,
  }));
  const afterBuckets = countBuckets(afterRecords);

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        rebalanceRange: {
          first: codeFor(START_INDEX),
          last: codeFor(END_INDEX),
        },
        updatedMembers: updates.length,
        directBucketsBefore: toDirectBucketSummary(beforeBuckets),
        directBucketsAfter: toDirectBucketSummary(afterBuckets),
        sampleUpdates: updates.slice(0, 12).map((update) => ({
          ...update,
          sponsorId: update.sponsorId.toString(),
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
