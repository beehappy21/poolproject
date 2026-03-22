#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SCALE = 100000000n;
const ROOT_MEMBER_ID = "TH0000001";

function parseDecimal(value) {
  if (typeof value === "bigint") {
    return value;
  }

  const raw = String(value ?? "0").trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const negative = raw.startsWith("-");
  const normalized = negative ? raw.slice(1) : raw;
  const [wholePart, fractionPart = ""] = normalized.split(".");
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  const result = BigInt(wholePart) * SCALE + BigInt(paddedFraction);
  return negative ? -result : result;
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

function resolveInputPath(argumentPath) {
  return argumentPath
    ? path.resolve(process.cwd(), argumentPath)
    : path.join(process.cwd(), "runtime", "member003-matrix-scenario.json");
}

function loadScenario(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildSlotLevels(width, depth) {
  const levels = [];
  for (let level = 1; level <= depth; level += 1) {
    const count = width ** level;
    for (let index = 0; index < count; index += 1) {
      levels.push(level);
    }
  }
  return levels;
}

function buildMemberState(member) {
  return {
    ...member,
    personalPv: parseDecimal(member.personalPv ?? "0"),
    active: Boolean(member.active),
    openedBoards: [],
  };
}

function resolvePlacementParent(member, memberMap) {
  if (member.sponsorId && memberMap.has(member.sponsorId) && member.id !== ROOT_MEMBER_ID) {
    return {
      parentId: member.sponsorId,
      relation: "sponsor",
    };
  }

  if (member.uplineId && memberMap.has(member.uplineId) && member.side && member.side !== "No Position") {
    return {
      parentId: member.uplineId,
      relation: "upline",
    };
  }

  return null;
}

function ensureRound(member, boardNo, roundNo, scenarioSettings, report) {
  const existing = member.openedBoards.find(
    (entry) => entry.boardNo === boardNo && entry.roundNo === roundNo,
  );
  if (existing) {
    return existing;
  }

  const round = {
    boardNo,
    roundNo,
    status: "OPEN",
    filledSlots: 0,
    slotLevels: buildSlotLevels(scenarioSettings.boardWidth, scenarioSettings.boardDepth),
    placements: [],
  };
  member.openedBoards.push(round);
  report.boardOpenings.push({
    memberId: member.id,
    boardNo,
    roundNo,
    trigger: roundNo === 1 ? "personal_pv_threshold" : "previous_round_completed",
  });
  return round;
}

function nextOpenRound(member, boardNo, scenarioSettings, report) {
  const rounds = member.openedBoards
    .filter((entry) => entry.boardNo === boardNo)
    .sort((left, right) => left.roundNo - right.roundNo);
  const openRound = rounds.find((entry) => entry.status === "OPEN");
  if (openRound) {
    return openRound;
  }

  const nextRoundNo = rounds.length + 1;
  return ensureRound(member, boardNo, nextRoundNo, scenarioSettings, report);
}

function canOpenBoardOne(member, settings) {
  return member.active && member.personalPv >= parseDecimal(settings.boardOpenPvThresholds[0]);
}

function canOpenBoard(member, boardNo, settings) {
  const threshold = settings.boardOpenPvThresholds[boardNo - 1];
  return member.active && member.personalPv >= parseDecimal(threshold ?? "0");
}

function hasBoardRound(member, boardNo, roundNo) {
  return member.openedBoards.some((entry) => entry.boardNo === boardNo && entry.roundNo === roundNo);
}

function maybeOpenNextBoard(member, completedBoardNo, scenarioSettings, report, queue) {
  const nextBoardNo = completedBoardNo + 1;
  if (nextBoardNo > scenarioSettings.boardCount) {
    return;
  }

  if (!canOpenBoard(member, nextBoardNo, scenarioSettings)) {
    return;
  }

  if (hasBoardRound(member, nextBoardNo, 1)) {
    return;
  }

  ensureRound(member, nextBoardNo, 1, scenarioSettings, report);
  queueOpeningEvent(queue, {
    memberId: member.id,
    boardNo: nextBoardNo,
    roundNo: 1,
    sourceType: "previous_board_completed",
  });
}

function queueOpeningEvent(queue, payload) {
  queue.push({
    ...payload,
  });
}

function maybeOpenEligibleBoards(member, settings, report, queue) {
  for (let boardNo = 1; boardNo < settings.boardCount; boardNo += 1) {
    const hasCompletedCurrentBoard = member.openedBoards.some(
      (entry) => entry.boardNo === boardNo && entry.status === "COMPLETED",
    );
    if (!hasCompletedCurrentBoard) {
      continue;
    }

    maybeOpenNextBoard(member, boardNo, settings, report, queue);
  }
}

function processQueue(queue, settings, memberMap, report) {
  while (queue.length > 0) {
    const event = queue.shift();
    const sourceMember = memberMap.get(event.memberId);
    const placement = resolvePlacementParent(sourceMember, memberMap);

    if (!placement) {
      report.companyFallbacks.push({
        memberId: sourceMember.id,
        boardNo: event.boardNo,
        roundNo: event.roundNo,
        reasonCode: "no_matrix_upline",
        sourceType: event.sourceType,
        sourceOrderId: event.sourceOrderId ?? null,
      });
      continue;
    }

    const beneficiary = memberMap.get(placement.parentId);
    const round = nextOpenRound(beneficiary, event.boardNo, settings, report);
    const slotIndex = round.filledSlots + 1;
    const levelNo = round.slotLevels[round.filledSlots];
    const rate = settings.boardLevelRates[event.boardNo - 1]?.[levelNo - 1] ?? "0";
    const amount = multiplyDecimal(settings.organizationPvRate, rate);

    round.filledSlots += 1;
    round.placements.push({
      sourceMemberId: sourceMember.id,
      sourceRoundNo: event.roundNo,
      slotIndex,
      levelNo,
    });

    report.placements.push({
      sourceMemberId: sourceMember.id,
      sourceRoundNo: event.roundNo,
      beneficiaryId: beneficiary.id,
      beneficiaryRoundNo: round.roundNo,
      boardNo: event.boardNo,
      levelNo,
      slotIndex,
      relation: placement.relation,
      amount: formatDecimal(amount),
      baseAmount: settings.organizationPvRate,
      rate,
      trigger: event.sourceType,
      sourceOrderId: event.sourceOrderId ?? null,
    });

    if (round.filledSlots === round.slotLevels.length) {
      round.status = "COMPLETED";
      maybeOpenNextBoard(beneficiary, event.boardNo, settings, report, queue);
      const nextRound = ensureRound(beneficiary, event.boardNo, round.roundNo + 1, settings, report);
      queueOpeningEvent(queue, {
        memberId: beneficiary.id,
        boardNo: event.boardNo,
        roundNo: nextRound.roundNo,
        sourceType: "round_reentry",
        sourceOrderId: event.sourceOrderId ?? null,
      });
    }
  }
}

function buildReport(input) {
  assertUniqueIds(input.members ?? [], "id", "member");

  const settings = {
    boardWidth: Number(input.settings?.boardWidth ?? 2),
    boardDepth: Number(input.settings?.boardDepth ?? 3),
    boardCount: Number(input.settings?.boardCount ?? 3),
    organizationPvRate: String(input.settings?.organizationPvRate ?? "700"),
    boardOpenPvThresholds: input.settings?.boardOpenPvThresholds ?? ["700", "700", "700"],
    boardLevelRates: input.settings?.boardLevelRates ?? [["0.2", "0.2", "0.2"]],
  };

  const members = (input.members ?? []).map(buildMemberState);
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const report = {
    settings,
    orderProgress: [],
    placements: [],
    boardOpenings: [],
    boardSummaries: [],
    companyFallbacks: [],
  };
  const queue = [];
  const orders = input.orders ?? [];

  if (orders.length > 0) {
    assertUniqueIds(orders, "invoiceNo", "order");
    for (const order of orders) {
      const member = memberMap.get(order.memberId);
      if (!member) {
        report.companyFallbacks.push({
          memberId: order.memberId,
          boardNo: 1,
          roundNo: 1,
          reasonCode: "member_not_found_for_order",
          sourceType: "order_event",
          sourceOrderId: order.invoiceNo,
        });
        continue;
      }

      member.personalPv += parseDecimal(order.pv);
      report.orderProgress.push({
        invoiceNo: order.invoiceNo,
        memberId: member.id,
        personalPvAfterOrder: formatDecimal(member.personalPv),
      });

      if (!hasBoardRound(member, 1, 1) && canOpenBoardOne(member, settings)) {
        ensureRound(member, 1, 1, settings, report);
        queueOpeningEvent(queue, {
          memberId: member.id,
          boardNo: 1,
          roundNo: 1,
          sourceType: "initial_board_open",
          sourceOrderId: order.invoiceNo,
        });
      }

      maybeOpenEligibleBoards(member, settings, report, queue);
      processQueue(queue, settings, memberMap, report);
    }
  } else {
    for (const member of members) {
      if (!canOpenBoardOne(member, settings)) {
        report.companyFallbacks.push({
          memberId: member.id,
          boardNo: 1,
          roundNo: 1,
          reasonCode: "personal_pv_below_threshold",
        });
        continue;
      }

      ensureRound(member, 1, 1, settings, report);
      queueOpeningEvent(queue, {
        memberId: member.id,
        boardNo: 1,
        roundNo: 1,
        sourceType: "initial_board_open",
      });
    }

    processQueue(queue, settings, memberMap, report);
  }

  for (const member of members) {
    for (const round of member.openedBoards.sort((left, right) => left.roundNo - right.roundNo)) {
      report.boardSummaries.push({
        memberId: member.id,
        boardNo: round.boardNo,
        roundNo: round.roundNo,
        status: round.status,
        filledSlots: round.filledSlots,
        totalSlots: round.slotLevels.length,
      });
    }
  }

  return {
    scenarioName: input.scenarioName ?? "matrix-sandbox",
    assumptions: [
      "Board 1 opens when personal PV accumulated from approved 700 PV orders reaches the configured threshold.",
      "Placement prefers sponsor line first; upline + side is used as fallback when sponsor placement is unavailable.",
      "Every new placement into a board pays immediately using organizationPvRate * board level rate.",
      "When a round completes, the next round opens immediately and creates a new placement event for the member's upline.",
    ],
    report,
  };
}

function main() {
  const inputPath = resolveInputPath(process.argv[2]);
  const outputPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : null;

  const result = buildReport(loadScenario(inputPath));
  const serialized = JSON.stringify(result, null, 2);

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${serialized}\n`, "utf8");
  }

  process.stdout.write(`${serialized}\n`);
}

main();
