#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SCALE = 100000000n;

function parseDecimal(value) {
  if (typeof value === "bigint") {
    return value;
  }

  const raw = String(value ?? "0").trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const [wholePart, fractionPart = ""] = raw.split(".");
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  return BigInt(wholePart) * SCALE + BigInt(paddedFraction);
}

function formatDecimal(value) {
  const negative = value < 0;
  const absolute = negative ? -value : value;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(8, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function multiplyDecimal(left, right) {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  return (a * b + SCALE / 2n) / SCALE;
}

function divideDecimal(dividend, divisor) {
  const a = parseDecimal(dividend);
  const b = parseDecimal(divisor);
  if (b === 0n) {
    return 0n;
  }

  return (a * SCALE + b / 2n) / b;
}

function addDecimal(left, right) {
  return parseDecimal(left) + parseDecimal(right);
}

function subtractDecimal(left, right) {
  return parseDecimal(left) - parseDecimal(right);
}

function minDecimal(left, right) {
  return parseDecimal(left) <= parseDecimal(right) ? parseDecimal(left) : parseDecimal(right);
}

function assertUniqueIds(items, key, label) {
  const seen = new Set();

  items.forEach((item, index) => {
    const value = item?.[key];
    if (!value) {
      throw new Error(`Missing ${label} ${key} at index ${index}`);
    }

    if (seen.has(value)) {
      throw new Error(`Duplicate ${label} ${key}: ${value}`);
    }

    seen.add(value);
  });
}

function validateScenario(input) {
  const members = input.members ?? [];
  const orders = input.orders ?? [];
  assertUniqueIds(members, "id", "member");
  assertUniqueIds(orders, "id", "order");
}

function resolveInputPath(argumentPath) {
  if (argumentPath) {
    return path.resolve(process.cwd(), argumentPath);
  }

  return path.join(process.cwd(), "scripts", "commission-sandbox.example.json");
}

function loadScenario(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function sortByDateThenId(items) {
  return [...items].sort((left, right) => {
    const leftKey = `${left.date}::${left.id}`;
    const rightKey = `${right.date}::${right.id}`;
    return leftKey.localeCompare(rightKey);
  });
}

function buildMemberState(member) {
  const meta = member.meta ?? {};
  return {
    ...member,
    active: Boolean(member.active),
    earningCap: parseDecimal(member.earningCap ?? "0"),
    earnedToDate: parseDecimal(member.earnedToDate ?? "0"),
    poolEarnedToDate: parseDecimal(meta.poolEarnedToDate ?? "0"),
    configurablePool: {
      purchaseBase: parseDecimal(meta.purchaseBase ?? "0"),
      poolCapMultiple: parseDecimal(meta.poolCapMultiple ?? "0"),
      commissionCapScope: String(meta.commissionCapScope ?? "pool_only").toLowerCase(),
      commissionCapMultiple: parseDecimal(meta.commissionCapMultiple ?? "0"),
    },
  };
}

function calculateDirectActiveCount(memberId, members) {
  return members.filter((candidate) => candidate.sponsorId === memberId && candidate.active)
    .length;
}

function buildUplineChain(startMemberId, memberMap) {
  const chain = [];
  const visited = new Set();
  let cursor = memberMap.get(startMemberId)?.sponsorId ?? null;

  while (cursor) {
    if (visited.has(cursor)) {
      throw new Error(`Detected sponsor cycle at member ${cursor}`);
    }

    visited.add(cursor);
    const member = memberMap.get(cursor);
    if (!member) {
      break;
    }

    chain.push(member.id);
    cursor = member.sponsorId ?? null;
  }

  return chain;
}

function isReceivable(member) {
  return member.active && member.earnedToDate < member.earningCap;
}

function canReceiveAmount(member, amount) {
  return member.active && member.earnedToDate + amount <= member.earningCap;
}

function resolvePoolRateForOrder(order, settings) {
  const meta = order.meta ?? {};
  const mode = String(meta.poolRateMode ?? "").toLowerCase();

  if (mode === "disabled") {
    return parseDecimal("0");
  }

  if (mode === "custom_rate") {
    return parseDecimal(meta.poolRate ?? "0");
  }

  if (mode === "default_50_percent") {
    return parseDecimal("0.5");
  }

  if (settings.useConfigurablePoolRate) {
    return parseDecimal("0.5");
  }

  return parseDecimal(settings.poolRate);
}

function resolvePoolCapDecision(member, amount) {
  const config = member.configurablePool ?? {};
  const purchaseBase = config.purchaseBase ?? 0n;

  if (purchaseBase <= 0n) {
    return { allowed: true, reasonCode: null };
  }

  const poolCapMultiple = config.poolCapMultiple ?? 0n;
  if (poolCapMultiple > 0n) {
    const poolCapAmount = multiplyDecimal(purchaseBase, poolCapMultiple);
    if (member.poolEarnedToDate + amount > poolCapAmount) {
      return { allowed: false, reasonCode: "pool_cap_reached_or_would_exceed_cap" };
    }
  }

  const commissionCapMultiple = config.commissionCapMultiple ?? 0n;
  if (
    String(config.commissionCapScope ?? "pool_only") === "all_commissions" &&
    commissionCapMultiple > 0n
  ) {
    const commissionCapAmount = multiplyDecimal(purchaseBase, commissionCapMultiple);
    if (member.earnedToDate + amount > commissionCapAmount) {
      return { allowed: false, reasonCode: "all_commissions_cap_reached_or_would_exceed_cap" };
    }
  }

  return { allowed: true, reasonCode: null };
}

function pushFallback(report, payload) {
  report.companyFallbacks.push({
    ...payload,
    amount: formatDecimal(parseDecimal(payload.amount)),
  });
}

function applyEarning(member, amount) {
  member.earnedToDate += amount;
}

function applyPoolEarning(member, amount) {
  member.poolEarnedToDate += amount;
  applyEarning(member, amount);
}

function calculateOrderCommissions(order, context) {
  const {
    settings,
    memberMap,
    report,
  } = context;
  const buyer = memberMap.get(order.buyerId);

  if (!buyer) {
    throw new Error(`Buyer not found for order ${order.id}`);
  }

  const pv = parseDecimal(order.pv);
  const uplineChain = buildUplineChain(order.buyerId, memberMap);
  const activeUplines = uplineChain
    .map((memberId) => memberMap.get(memberId))
    .filter((member) => member && member.active);

  settings.directLevelRates.forEach((rate, index) => {
    const levelNo = index + 1;
    const amount = multiplyDecimal(pv, rate);
    const beneficiary = activeUplines[index] ?? null;

    if (!beneficiary) {
      pushFallback(report, {
        sourceType: "direct",
        sourceRefId: order.id,
        orderId: order.id,
        levelNo,
        beneficiaryId: null,
        reasonCode: "no_active_sponsor",
        amount,
      });
      return;
    }

    if (!canReceiveAmount(beneficiary, amount)) {
      pushFallback(report, {
        sourceType: "direct",
        sourceRefId: order.id,
        orderId: order.id,
        levelNo,
        beneficiaryId: beneficiary.id,
        reasonCode: "cap_reached_or_would_exceed_cap",
        amount,
      });
      return;
    }

    applyEarning(beneficiary, amount);
    report.direct.push({
      orderId: order.id,
      buyerId: order.buyerId,
      beneficiaryId: beneficiary.id,
      levelNo,
      rate,
      basePv: formatDecimal(pv),
      amount: formatDecimal(amount),
      rolledUpFromBuyerUplineDepth: uplineChain.indexOf(beneficiary.id) + 1,
    });
  });

  settings.uniLevelRates.forEach((rate, index) => {
    const levelNo = index + 1;
    const amount = multiplyDecimal(pv, rate);
    const beneficiary = activeUplines[index] ?? null;

    if (!beneficiary) {
      pushFallback(report, {
        sourceType: "uni",
        sourceRefId: order.id,
        orderId: order.id,
        levelNo,
        beneficiaryId: null,
        reasonCode: "insufficient_active_uplines",
        amount,
      });
      return;
    }

    if (!canReceiveAmount(beneficiary, amount)) {
      pushFallback(report, {
        sourceType: "uni",
        sourceRefId: order.id,
        orderId: order.id,
        levelNo,
        beneficiaryId: beneficiary.id,
        reasonCode: "cap_reached_or_would_exceed_cap",
        amount,
      });
      return;
    }

    applyEarning(beneficiary, amount);
    report.uni.push({
      orderId: order.id,
      buyerId: order.buyerId,
      beneficiaryId: beneficiary.id,
      levelNo,
      rate,
      basePv: formatDecimal(pv),
      amount: formatDecimal(amount),
      compressedDepth: uplineChain.indexOf(beneficiary.id) + 1,
    });
  });
}

function calculatePoolForDate(date, orders, context) {
  const { settings, members, memberMap, report } = context;
  const totalPv = orders.reduce((sum, order) => sum + parseDecimal(order.pv), 0n);
  const totalPoolContribution = orders.reduce(
    (sum, order) => sum + multiplyDecimal(order.pv, resolvePoolRateForOrder(order, settings)),
    0n,
  );
  const poolFund = settings.useConfigurablePoolRate
    ? totalPoolContribution
    : multiplyDecimal(totalPv, settings.poolRate);
  const eligibleMembers = members.filter((member) => {
    const directActiveCount = calculateDirectActiveCount(member.id, members);
    return directActiveCount >= 2 && isReceivable(member);
  });

  if (eligibleMembers.length === 0) {
    pushFallback(report, {
      sourceType: "pool",
      sourceRefId: date,
      orderId: null,
      levelNo: null,
      beneficiaryId: null,
      reasonCode: "no_eligible_members",
      amount: poolFund,
    });

    report.poolCycles.push({
      date,
      totalPv: formatDecimal(totalPv),
      poolRate: settings.poolRate,
      poolFund: formatDecimal(poolFund),
      eligibleMemberCount: 0,
      payoutPerMember: "0",
      payouts: [],
    });
    return;
  }

  const payoutPerMember = divideDecimal(poolFund, eligibleMembers.length);
  const payouts = [];

  for (const member of eligibleMembers) {
    const capDecision = resolvePoolCapDecision(member, payoutPerMember);
    if (!capDecision.allowed) {
      pushFallback(report, {
        sourceType: "pool",
        sourceRefId: date,
        orderId: null,
        levelNo: null,
        beneficiaryId: member.id,
        reasonCode: capDecision.reasonCode,
        amount: payoutPerMember,
      });
      continue;
    }

    if (!canReceiveAmount(member, payoutPerMember)) {
      pushFallback(report, {
        sourceType: "pool",
        sourceRefId: date,
        orderId: null,
        levelNo: null,
        beneficiaryId: member.id,
        reasonCode: "cap_reached_or_would_exceed_cap",
        amount: payoutPerMember,
      });
      continue;
    }

    applyPoolEarning(member, payoutPerMember);
    payouts.push({
      beneficiaryId: member.id,
      amount: formatDecimal(payoutPerMember),
    });
  }

  report.poolCycles.push({
    date,
    totalPv: formatDecimal(totalPv),
    poolRate: settings.poolRate,
    poolFund: formatDecimal(poolFund),
    eligibleMemberCount: eligibleMembers.length,
    payoutPerMember: formatDecimal(payoutPerMember),
    payouts,
  });
}

function summarizeMembers(members) {
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    sponsorId: member.sponsorId ?? null,
    active: member.active,
    earningCap: formatDecimal(member.earningCap),
    earnedToDate: formatDecimal(member.earnedToDate),
    poolEarnedToDate: formatDecimal(member.poolEarnedToDate ?? 0n),
    directActiveCount: calculateDirectActiveCount(member.id, members),
  }));
}

function buildReport(input) {
  validateScenario(input);
  const settings = {
    directLevelRates: input.settings?.directLevelRates ?? ["0.2"],
    uniLevelRates: input.settings?.uniLevelRates ?? [
      "0.01",
      "0.01",
      "0.01",
      "0.01",
      "0.01",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
      "0.005",
    ],
    poolRate: input.settings?.poolRate ?? "0.5",
    useConfigurablePoolRate: Boolean(input.settings?.useConfigurablePoolRate),
  };

  const members = (input.members ?? []).map(buildMemberState);
  const orders = sortByDateThenId(input.orders ?? []);
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const report = {
    settings,
    direct: [],
    uni: [],
    poolCycles: [],
    companyFallbacks: [],
  };

  orders.forEach((order) => calculateOrderCommissions(order, { settings, memberMap, report }));

  const ordersByDate = new Map();
  orders.forEach((order) => {
    const current = ordersByDate.get(order.date) ?? [];
    current.push(order);
    ordersByDate.set(order.date, current);
  });

  [...ordersByDate.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .forEach(([date, dateOrders]) => {
      calculatePoolForDate(date, dateOrders, {
        settings,
        members,
        memberMap,
        report,
      });
    });

  return {
    scenarioName: input.scenarioName ?? "commission-sandbox",
    assumptions: [
      "No DB or API access. All calculations use only the input JSON.",
      "A payout is rejected in full if it would exceed earningCap. No partial payout is split.",
      "Direct and uni both use compressed active upline selection from the sponsor chain; members at cap do not get skipped.",
      "Pool eligibility requires active status and at least 2 direct active referrals.",
    ],
    report,
    members: summarizeMembers(members),
  };
}

function main() {
  const inputPath = resolveInputPath(process.argv[2]);
  const outputPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : null;

  const scenario = loadScenario(inputPath);
  const result = buildReport(scenario);
  const serialized = JSON.stringify(result, null, 2);

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${serialized}\n`, "utf8");
  }

  process.stdout.write(`${serialized}\n`);
}

main();
