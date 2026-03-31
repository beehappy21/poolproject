import { ConflictException } from "@nestjs/common";

import {
  readRuntimeCollection,
  writeRuntimeCollection,
} from "./admin-runtime.util";

export type LineBindingRecord = {
  userId: string;
  memberCode: string;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  statusMessage: string | null;
  source: string | null;
  boundAt: string;
  lastSyncedAt: string;
};

const LINE_BINDINGS_FILE = "line-bindings.json";

export function readLineBindings(): LineBindingRecord[] {
  return readRuntimeCollection<LineBindingRecord[]>(LINE_BINDINGS_FILE, []);
}

export function listLineBindings(): LineBindingRecord[] {
  return readLineBindings()
    .slice()
    .sort((left, right) => right.lastSyncedAt.localeCompare(left.lastSyncedAt));
}

export function getLineBindingByUserId(
  userId: string,
): LineBindingRecord | null {
  return readLineBindings().find((item) => item.userId === userId) || null;
}

export function upsertLineBinding(
  input: Omit<LineBindingRecord, "boundAt" | "lastSyncedAt">,
): LineBindingRecord {
  const items = readLineBindings();
  const now = new Date().toISOString();
  const existingByUserId =
    items.find((item) => item.userId === input.userId) || null;
  const existingByLineUserId =
    items.find((item) => item.lineUserId === input.lineUserId) || null;

  if (existingByLineUserId && existingByLineUserId.userId !== input.userId) {
    throw new ConflictException("LINE account is already connected to another member.");
  }

  const nextItems = items.filter(
    (item) => item.userId !== input.userId && item.lineUserId !== input.lineUserId,
  );
  const existing = existingByUserId || existingByLineUserId;

  const record: LineBindingRecord = {
    ...input,
    boundAt: existing?.boundAt || now,
    lastSyncedAt: now,
  };

  writeRuntimeCollection(LINE_BINDINGS_FILE, [record, ...nextItems]);
  return record;
}

export function removeLineBindingByUserId(
  userId: string,
): LineBindingRecord | null {
  const items = readLineBindings();
  const existing = items.find((item) => item.userId === userId) || null;

  if (!existing) {
    return null;
  }

  writeRuntimeCollection(
    LINE_BINDINGS_FILE,
    items.filter((item) => item.userId !== userId),
  );

  return existing;
}

export function forceRebindLineBindingByUserId(userId: string): {
  record: LineBindingRecord | null;
  removedDuplicates: LineBindingRecord[];
} {
  const items = readLineBindings();
  const record = items.find((item) => item.userId === userId) || null;

  if (!record) {
    return {
      record: null,
      removedDuplicates: [],
    };
  }

  const removedDuplicates = items.filter(
    (item) => item.userId !== userId && item.lineUserId === record.lineUserId,
  );
  const nextRecord: LineBindingRecord = {
    ...record,
    source: "admin_force_rebind",
    lastSyncedAt: new Date().toISOString(),
  };
  const nextItems = [
    nextRecord,
    ...items.filter((item) => item.userId !== userId && item.lineUserId !== record.lineUserId),
  ];

  writeRuntimeCollection(LINE_BINDINGS_FILE, nextItems);

  return {
    record: nextRecord,
    removedDuplicates,
  };
}
