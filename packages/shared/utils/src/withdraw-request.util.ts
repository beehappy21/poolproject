import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

export interface WithdrawRequest {
  requestId: string;
  userId: string;
  memberCode: string;
  amount: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  note: string | null;
  status: "pending";
  requestedAt: string;
}

const STORAGE_PATH = join(process.cwd(), "runtime", "withdraw-requests.json");

function readStorage(): WithdrawRequest[] {
  try {
    const raw = readFileSync(STORAGE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(requests: WithdrawRequest[]) {
  mkdirSync(join(process.cwd(), "runtime"), {recursive: true});
  writeFileSync(STORAGE_PATH, `${JSON.stringify(requests, null, 2)}\n`, "utf8");
}

export function listWithdrawRequestsForUser(userId: string): WithdrawRequest[] {
  return readStorage().filter(request => request.userId === userId);
}

export function createWithdrawRequest(input: {
  userId: string;
  memberCode: string;
  amount: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  note?: string | null;
}): WithdrawRequest {
  const requests = readStorage();
  const request: WithdrawRequest = {
    requestId: `${Date.now()}`,
    userId: input.userId,
    memberCode: input.memberCode,
    amount: input.amount,
    bankName: input.bankName,
    accountName: input.accountName,
    accountNumber: input.accountNumber,
    note: input.note ?? null,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };

  requests.unshift(request);
  writeStorage(requests);
  return request;
}
