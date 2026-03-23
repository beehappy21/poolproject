const { PrismaClient } = require("@prisma/client");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();

function parseArgs(argv) {
  const options = {
    apply: false,
    orderIds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--order-id") {
      const value = argv[index + 1];
      if (!value || !/^\d+$/.test(value)) {
        throw new Error("--order-id requires a positive integer value");
      }
      options.orderIds.push(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function loadTargets(orderIds) {
  const whereSql =
    orderIds.length > 0
      ? `where cl."commissionAmount" = 0 and cl."orderId" in (${orderIds.join(",")})`
      : 'where cl."commissionAmount" = 0';

  return prisma.$queryRawUnsafe(
    `
      select
        cl.id::text as "commissionId",
        cl."orderId"::text as "orderId",
        cl."commissionType"::text as "commissionType",
        cl.status::text as "status",
        cl."beneficiaryUserId"::text as "beneficiaryUserId"
      from "CommissionLedger" cl
      ${whereSql}
      order by cl."orderId" asc nulls last, cl.id asc
    `,
  );
}

async function summarizeTargets(targets) {
  const commissionIds = targets.map((target) => BigInt(target.commissionId));
  const orderIds = Array.from(
    new Set(
      targets
        .map((target) => target.orderId)
        .filter((value) => typeof value === "string" && value.length > 0),
    ),
  ).map((value) => BigInt(value));

  const [walletTransactions, companyFallbacks] = await Promise.all([
    commissionIds.length > 0
      ? prisma.walletTransaction.findMany({
          where: {
            refType: "commission",
            refId: { in: commissionIds },
          },
          select: {
            id: true,
            refId: true,
            txType: true,
            amount: true,
            userId: true,
          },
        })
      : [],
    orderIds.length > 0
      ? prisma.companyBonusLedger.findMany({
          where: {
            sourceRefId: { in: orderIds },
            amount: "0",
          },
          select: {
            id: true,
            sourceRefId: true,
            sourceType: true,
            bonusType: true,
            amount: true,
            reason: true,
          },
        })
      : [],
  ]);

  return { walletTransactions, companyFallbacks };
}

function printSummary(targets, walletTransactions, companyFallbacks, apply) {
  process.stdout.write(
    `${apply ? "Apply" : "Dry run"} zero-commission cleanup\n`,
  );
  process.stdout.write(`Commission rows: ${targets.length}\n`);
  process.stdout.write(`Wallet rows: ${walletTransactions.length}\n`);
  process.stdout.write(`Company fallback rows: ${companyFallbacks.length}\n`);

  if (targets.length === 0) {
    return;
  }

  const preview = targets
    .slice(0, 10)
    .map(
      (target) =>
        `- commissionId=${target.commissionId} orderId=${target.orderId || "-"} type=${target.commissionType} status=${target.status}`,
    )
    .join("\n");

  process.stdout.write(`${preview}\n`);
}

async function applyCleanup(targets, walletTransactions, companyFallbacks) {
  const commissionIds = targets.map((target) => target.commissionId);
  const walletIds = walletTransactions.map((row) => row.id.toString());
  const fallbackIds = companyFallbacks.map((row) => row.id.toString());

  await prisma.$transaction(async (tx) => {
    if (walletIds.length > 0) {
      await tx.$executeRawUnsafe(
        `delete from "WalletTransaction" where id in (${walletIds.join(",")})`,
      );
    }

    if (fallbackIds.length > 0) {
      await tx.$executeRawUnsafe(
        `delete from "CompanyBonusLedger" where id in (${fallbackIds.join(",")})`,
      );
    }

    if (commissionIds.length > 0) {
      await tx.$executeRawUnsafe(
        `delete from "CommissionLedger" where id in (${commissionIds.join(",")})`,
      );
    }
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = await loadTargets(options.orderIds);
  const { walletTransactions, companyFallbacks } = await summarizeTargets(targets);

  printSummary(
    targets,
    walletTransactions,
    companyFallbacks,
    options.apply,
  );

  if (!options.apply || targets.length === 0) {
    if (!options.apply) {
      process.stdout.write("No changes applied. Re-run with --apply to delete.\n");
    }
    return;
  }

  await applyCleanup(targets, walletTransactions, companyFallbacks);
  process.stdout.write("Cleanup complete.\n");
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
