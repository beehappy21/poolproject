import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const runtimePath = join(process.cwd(), "runtime", "line-bindings.json");

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

async function main() {
  if (!existsSync(runtimePath)) {
    console.log(`No runtime line binding file found at ${runtimePath}`);
    return;
  }

  const parsed = JSON.parse(readFileSync(runtimePath, "utf8"));
  const items = Array.isArray(parsed) ? parsed : [];

  if (items.length === 0) {
    console.log("Runtime line binding file is empty.");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const item of items) {
    const userId = normalizeString(item?.userId);
    const lineUserId = normalizeString(item?.lineUserId);

    if (!userId || !lineUserId) {
      skipped += 1;
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, memberCode: true },
    });

    if (!user) {
      console.log(`Skipping missing user ${userId} for LINE user ${lineUserId}`);
      skipped += 1;
      continue;
    }

    await prisma.lineBinding.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        lineUserId,
        displayName: normalizeString(item?.displayName),
        pictureUrl: normalizeString(item?.pictureUrl),
        statusMessage: normalizeString(item?.statusMessage),
        source: normalizeString(item?.source),
        boundAt: item?.boundAt ? new Date(item.boundAt) : new Date(),
        lastSyncedAt: item?.lastSyncedAt ? new Date(item.lastSyncedAt) : new Date(),
      },
      update: {
        lineUserId,
        displayName: normalizeString(item?.displayName),
        pictureUrl: normalizeString(item?.pictureUrl),
        statusMessage: normalizeString(item?.statusMessage),
        source: normalizeString(item?.source),
        boundAt: item?.boundAt ? new Date(item.boundAt) : undefined,
        lastSyncedAt: item?.lastSyncedAt ? new Date(item.lastSyncedAt) : new Date(),
      },
    });

    migrated += 1;
  }

  console.log(
    `LINE binding runtime migration complete. migrated=${migrated} skipped=${skipped}`,
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
