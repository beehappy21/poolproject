const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("node:crypto");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function upsertUser(input) {
  return prisma.user.upsert({
    where: { memberCode: input.memberCode },
    update: {
      referralCode: input.referralCode,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      sponsorId: input.sponsorId,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
    },
    create: {
      memberCode: input.memberCode,
      referralCode: input.referralCode,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      sponsorId: input.sponsorId,
      status: "ACTIVE",
      payoutStatus: "ACTIVE",
      riskLevel: "NORMAL",
    },
  });
}

async function main() {
  const pkg = await prisma.package.upsert({
    where: { code: "STARTER" },
    update: {
      name: "Starter Package",
      priceUsdt: "100",
      pv: "100",
      activeDays: 30,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "300",
      status: "ACTIVE",
    },
    create: {
      code: "STARTER",
      name: "Starter Package",
      priceUsdt: "100",
      pv: "100",
      activeDays: 30,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "300",
      status: "ACTIVE",
    },
  });

  const alice = await upsertUser({
    memberCode: "ALICE",
    referralCode: "A1B2345",
    name: "Alice Root",
    email: "alice@example.com",
    passwordHash: hashPassword("dev-password"),
    sponsorId: null,
  });
  const bob = await upsertUser({
    memberCode: "BOB",
    referralCode: "B2C3456",
    name: "Bob Sponsor",
    email: "bob@example.com",
    passwordHash: hashPassword("dev-password"),
    sponsorId: alice.id,
  });
  const carol = await upsertUser({
    memberCode: "CAROL",
    referralCode: "C3D4567",
    name: "Carol Direct",
    email: "carol@example.com",
    passwordHash: hashPassword("dev-password"),
    sponsorId: alice.id,
  });
  const dave = await upsertUser({
    memberCode: "DAVE",
    referralCode: "D4E5678",
    name: "Dave Buyer",
    email: "dave@example.com",
    passwordHash: hashPassword("dev-password"),
    sponsorId: bob.id,
  });
  const eve = await upsertUser({
    memberCode: "EVE",
    referralCode: "E5F6789",
    name: "Eve Direct",
    email: "eve@example.com",
    passwordHash: hashPassword("dev-password"),
    sponsorId: bob.id,
  });

  const now = new Date();
  const activatedAt = new Date(now);
  activatedAt.setUTCDate(activatedAt.getUTCDate() - 1);
  activatedAt.setUTCHours(0, 0, 0, 0);
  const activeUntil = new Date(activatedAt);
  activeUntil.setUTCDate(activeUntil.getUTCDate() + 30);

  for (const user of [alice, bob, carol, dave, eve]) {
    await prisma.memberPackageCycle.upsert({
      where: {
        userId_cycleNo: {
          userId: user.id,
          cycleNo: 1,
        },
      },
      update: {
        packageId: pkg.id,
        activatedAt,
        activeUntil,
        earningCap: "300",
        earnedTotalInCycle: "0",
        earningStatus: "ACTIVE",
        isReceivable: true,
        status: "ACTIVE",
      },
      create: {
        userId: user.id,
        packageId: pkg.id,
        cycleNo: 1,
        activatedAt,
        activeUntil,
        earningCap: "300",
        earnedTotalInCycle: "0",
        earningStatus: "ACTIVE",
        isReceivable: true,
        status: "ACTIVE",
      },
    });
  }

  await prisma.order.upsert({
    where: { orderNo: "ORD-DEV-001" },
    update: {
      userId: dave.id,
      subtotalUsdt: "100",
      totalUsdt: "100",
      totalPv: "100",
      paidAt: now,
      approvedAt: now,
      approvalStatus: "APPROVED",
      status: "APPROVED",
    },
    create: {
      orderNo: "ORD-DEV-001",
      userId: dave.id,
      subtotalUsdt: "100",
      totalUsdt: "100",
      totalPv: "100",
      paidAt: now,
      approvedAt: now,
      approvalStatus: "APPROVED",
      status: "APPROVED",
    },
  });

  process.stdout.write("Seeded dev data: users, cycles, package, approved order.\n");
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
