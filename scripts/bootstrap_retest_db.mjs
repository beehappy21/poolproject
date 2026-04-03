import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const apply = process.argv.includes("--apply");
const dropExisting = process.argv.includes("--drop-existing");
const allowDestructive = process.env.ALLOW_DESTRUCTIVE_LOCAL_RESET === "1";
const sourceDatabaseUrl =
  process.env.SOURCE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject?schema=public";
const targetDatabaseUrl =
  process.env.TARGET_DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/poolproject_retest?schema=public";
const dockerContainer = process.env.POSTGRES_DOCKER_CONTAINER || "poolproject-postgres";
const freshMemberCount = Number(process.env.RETEST_MEMBER_COUNT || "30");

if (!Number.isInteger(freshMemberCount) || freshMemberCount < 3) {
  throw new Error("RETEST_MEMBER_COUNT must be an integer >= 3.");
}

const sourceUrl = new URL(sourceDatabaseUrl);
const targetUrl = new URL(targetDatabaseUrl);
const sourceDatabaseName = sourceUrl.pathname.replace(/^\//, "") || "poolproject";
const targetDatabaseName = targetUrl.pathname.replace(/^\//, "") || "poolproject_retest";
const postgresUser = targetUrl.username || sourceUrl.username || "postgres";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function memberCodeFromId(id) {
  return `TH${String(id).padStart(7, "0")}`;
}

function memberNameFromId(id) {
  return `Retest Member ${String(id).padStart(4, "0")}`;
}

function stringifyForLog(value) {
  return JSON.stringify(value, (_key, currentValue) =>
    typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
  );
}

function referralCodeFromId(id) {
  return `RT${String(id).padStart(5, "0")}`;
}

function sponsorIdFromId(id) {
  if (id <= 1) {
    return null;
  }

  return BigInt(Math.floor(id / 2));
}

function placementSideFromId(id) {
  if (id <= 1) {
    return null;
  }

  return id % 2 === 0 ? "LEFT" : "RIGHT";
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    env: options.env || process.env,
    input: options.input,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed.`);
  }

  return result.stdout || "";
}

function runDockerPsql(sql, databaseName = "postgres") {
  return runCommand(
    "docker",
    [
      "exec",
      "-i",
      dockerContainer,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      postgresUser,
      "-d",
      databaseName,
    ],
    { input: sql },
  );
}

function ensureTargetDatabase() {
  if (dropExisting) {
    if (!allowDestructive) {
      throw new Error(
        "Refusing to drop the retest database. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue.",
      );
    }

    runDockerPsql(`drop database if exists "${targetDatabaseName}";`);
  }

  const existsOutput = runDockerPsql(
    `select 1 from pg_database where datname = '${targetDatabaseName.replace(/'/g, "''")}';`,
  );

  if (!String(existsOutput).trim()) {
    runDockerPsql(`create database "${targetDatabaseName}";`);
  }
}

function pushTargetSchema() {
  runCommand(
    "npx",
    ["prisma", "db", "push", "--schema", "prisma/schema.prisma", "--accept-data-loss"],
    {
      env: {
        ...process.env,
        DATABASE_URL: targetDatabaseUrl,
      },
    },
  );
}

async function copyCatalogMasters(source, target) {
  const [suppliers, categories, products, productDetails, packages, packageItems] =
    await Promise.all([
      source.supplier.findMany({ orderBy: { id: "asc" } }),
      source.productCategory.findMany({ orderBy: { id: "asc" } }),
      source.product.findMany({ orderBy: { id: "asc" } }),
      source.productDetail.findMany({ orderBy: { id: "asc" } }),
      source.package.findMany({ orderBy: { id: "asc" } }),
      source.packageItem.findMany({ orderBy: { id: "asc" } }),
    ]);

  if (suppliers.length > 0) {
    await target.supplier.createMany({ data: suppliers, skipDuplicates: true });
  }
  if (categories.length > 0) {
    await target.productCategory.createMany({ data: categories, skipDuplicates: true });
  }
  if (products.length > 0) {
    await target.product.createMany({ data: products, skipDuplicates: true });
  }
  if (productDetails.length > 0) {
    await target.productDetail.createMany({ data: productDetails, skipDuplicates: true });
  }
  if (packages.length > 0) {
    await target.package.createMany({ data: packages, skipDuplicates: true });
  }
  if (packageItems.length > 0) {
    await target.packageItem.createMany({ data: packageItems, skipDuplicates: true });
  }

  return {
    suppliers: suppliers.length,
    categories: categories.length,
    products: products.length,
    productDetails: productDetails.length,
    packages: packages.length,
    packageItems: packageItems.length,
  };
}

async function seedFreshMembers(target) {
  const defaultPasswordHash = hashPassword("123456");

  for (let id = 1; id <= freshMemberCount; id += 1) {
    const sponsorId = sponsorIdFromId(id);

    await target.user.create({
      data: {
        id: BigInt(id),
        memberCode: memberCodeFromId(id),
        referralCode: referralCodeFromId(id),
        name: memberNameFromId(id),
        email: null,
        phone: null,
        passwordHash: defaultPasswordHash,
        sponsorId,
        status: "ACTIVE",
        riskLevel: "NORMAL",
        payoutStatus: "ACTIVE",
        isAdmin: false,
        manualReviewRequired: false,
        matrixPersonalPv: "0",
      },
    });

    await target.memberProfile.create({
      data: {
        userId: BigInt(id),
        uplineUserId: sponsorId,
        placementSide: placementSideFromId(id),
      },
    });

    await target.wallet.create({
      data: {
        userId: BigInt(id),
      },
    });
  }

  await target.$executeRawUnsafe(
    `select setval(pg_get_serial_sequence('"User"', 'id'), ${freshMemberCount + 1}, false);`,
  );
  await target.$executeRawUnsafe(
    `select setval(pg_get_serial_sequence('"MemberProfile"', 'id'), ${freshMemberCount + 1}, false);`,
  );
  await target.$executeRawUnsafe(
    `select setval(pg_get_serial_sequence('"Wallet"', 'id'), ${freshMemberCount + 1}, false);`,
  );
}

async function inspectTarget(target) {
  const [userCount, productDetailCount, packageCount] = await Promise.all([
    target.user.count(),
    target.productDetail.count(),
    target.package.count(),
  ]);

  const firstMembers = await target.user.findMany({
    orderBy: { id: "asc" },
    take: 10,
    select: {
      id: true,
      memberCode: true,
      name: true,
    },
  });

  return {
    userCount,
    productDetailCount,
    packageCount,
    firstMembers,
  };
}

process.stdout.write("bootstrap_scope=retest_database\n");
process.stdout.write(`source_database=${sourceDatabaseName}\n`);
process.stdout.write(`target_database=${targetDatabaseName}\n`);
process.stdout.write(`docker_container=${dockerContainer}\n`);
process.stdout.write(`fresh_member_count=${freshMemberCount}\n`);
process.stdout.write("fresh_member_pattern=TH0000001 -> id 1\n");

if (!apply) {
  process.stdout.write("dry_run=yes\n");
  process.exit(0);
}

if (!allowDestructive) {
  throw new Error(
    "Refusing to bootstrap retest DB. Set ALLOW_DESTRUCTIVE_LOCAL_RESET=1 to continue.",
  );
}

ensureTargetDatabase();
pushTargetSchema();

const source = new PrismaClient({
  datasources: {
    db: {
      url: sourceDatabaseUrl,
    },
  },
});
const target = new PrismaClient({
  datasources: {
    db: {
      url: targetDatabaseUrl,
    },
  },
});

try {
  const catalogCounts = await copyCatalogMasters(source, target);
  await seedFreshMembers(target);
  const inspection = await inspectTarget(target);

  process.stdout.write(`catalog_suppliers=${catalogCounts.suppliers}\n`);
  process.stdout.write(`catalog_categories=${catalogCounts.categories}\n`);
  process.stdout.write(`catalog_products=${catalogCounts.products}\n`);
  process.stdout.write(`catalog_product_details=${catalogCounts.productDetails}\n`);
  process.stdout.write(`catalog_packages=${catalogCounts.packages}\n`);
  process.stdout.write(`catalog_package_items=${catalogCounts.packageItems}\n`);
  process.stdout.write(`target_user_count=${inspection.userCount}\n`);
  process.stdout.write(`target_product_detail_count=${inspection.productDetailCount}\n`);
  process.stdout.write(`target_package_count=${inspection.packageCount}\n`);
  process.stdout.write(`first_members=${stringifyForLog(inspection.firstMembers)}\n`);
  process.stdout.write("apply=ok\n");
} finally {
  await Promise.all([source.$disconnect(), target.$disconnect()]);
}
