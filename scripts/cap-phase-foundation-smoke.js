const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toNumber(value) {
  return Number(value?.toString?.() ?? value ?? 0);
}

async function main() {
  const suffix = `${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      memberCode: `CAP${suffix.slice(-8)}`,
      referralCode: `CP${suffix.slice(-6)}`,
      name: "CAP Foundation Smoke",
      email: `cap.foundation.${suffix}@example.com`,
      passwordHash: "smoke-only",
    },
  });

  const firstOrder = await prisma.order.create({
    data: {
      orderNo: `8${suffix.slice(-6)}`,
      userId: user.id,
      subtotalUsdt: "100",
      totalUsdt: "100",
      totalPv: "100",
      paidAt: new Date("2026-04-01T01:00:00.000Z"),
      approvedAt: new Date("2026-04-01T01:00:00.000Z"),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: {
        create: {
          qty: 1,
          unitPriceUsdt: "100",
          unitPv: "100",
          lineTotalUsdt: "100",
          lineTotalPv: "100",
        },
      },
    },
    include: { orderItems: true },
  });

  const secondOrder = await prisma.order.create({
    data: {
      orderNo: `9${suffix.slice(-6)}`,
      userId: user.id,
      subtotalUsdt: "100",
      totalUsdt: "100",
      totalPv: "100",
      paidAt: new Date("2026-04-02T01:00:00.000Z"),
      approvedAt: new Date("2026-04-02T01:00:00.000Z"),
      approvalStatus: "APPROVED",
      status: "APPROVED",
      orderItems: {
        create: {
          qty: 1,
          unitPriceUsdt: "100",
          unitPv: "100",
          lineTotalUsdt: "100",
          lineTotalPv: "100",
        },
      },
    },
    include: { orderItems: true },
  });

  const firstBucket = await prisma.capBucket.create({
    data: {
      userId: user.id,
      sourceOrderId: firstOrder.id,
      sourceOrderItemId: firstOrder.orderItems[0].id,
      sourceType: "smoke",
      grantIndex: 0,
      grantedAmount: "10000",
      sourceApprovedAt: firstOrder.approvedAt,
      ledgers: {
        create: {
          userId: user.id,
          sourceOrderId: firstOrder.id,
          sourceOrderItemId: firstOrder.orderItems[0].id,
          sourceType: "smoke",
          movementType: "GRANT",
          amount: "10000",
          status: "POSTED",
          idempotencyKey: `smoke:cap:grant:${suffix}:1`,
          postedAt: new Date(),
        },
      },
    },
  });

  const secondBucket = await prisma.capBucket.create({
    data: {
      userId: user.id,
      sourceOrderId: secondOrder.id,
      sourceOrderItemId: secondOrder.orderItems[0].id,
      sourceType: "smoke",
      grantIndex: 0,
      grantedAmount: "10000",
      sourceApprovedAt: secondOrder.approvedAt,
      ledgers: {
        create: {
          userId: user.id,
          sourceOrderId: secondOrder.id,
          sourceOrderItemId: secondOrder.orderItems[0].id,
          sourceType: "smoke",
          movementType: "GRANT",
          amount: "10000",
          status: "POSTED",
          idempotencyKey: `smoke:cap:grant:${suffix}:2`,
          postedAt: new Date(),
        },
      },
    },
  });

  await prisma.capBucket.update({
    where: { id: firstBucket.id },
    data: { usedCommissionAmount: "9500" },
  });

  const buckets = await prisma.capBucket.findMany({
    where: { userId: user.id, status: "OPEN" },
    orderBy: [{ sourceApprovedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  assert(buckets.length === 2, "expected two separate CAP buckets");
  assert(buckets[0].id === firstBucket.id, "FIFO should start with older bucket");
  assert(buckets[1].id === secondBucket.id, "newer bucket should remain second");

  const totalGranted = buckets.reduce((sum, bucket) => sum + toNumber(bucket.grantedAmount), 0);
  const totalRemaining = buckets.reduce((sum, bucket) => {
    return (
      sum +
      toNumber(bucket.grantedAmount) +
      toNumber(bucket.adjustedAmount) -
      toNumber(bucket.usedCommissionAmount) -
      toNumber(bucket.reservedDcwAmount) -
      toNumber(bucket.usedDcwAmount)
    );
  }, 0);

  assert(totalGranted === 20000, "aggregated CAP grant should include both buckets");
  assert(totalRemaining === 10500, "remaining CAP should not expire or merge buckets");

  process.stdout.write(
    JSON.stringify(
      {
        scenario: "cap_phase_foundation_smoke",
        userId: user.id.toString(),
        bucketIds: buckets.map((bucket) => bucket.id.toString()),
        totalGranted,
        totalRemaining,
      },
      null,
      2,
    ) + "\n",
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
