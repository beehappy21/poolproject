#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SCALE = 100000000n;

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
    : path.join(process.cwd(), "runtime", "member003-matrix-legacy-scenario.json");
}

function loadScenario(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseDateParts(raw) {
  const value = String(raw ?? "").trim();
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return { day: 1, month: 1, year: 1900, numeric: 19000101 };
  }
  const [, day, month, year] = match;
  const numeric = Number(`${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`);
  return {
    day: Number(day),
    month: Number(month),
    year: Number(year),
    numeric,
  };
}

function buildSlotLevels(width, depth) {
  const slots = [];
  let nextSlotIndex = 1;
  let currentParents = [0];

  for (let level = 1; level <= depth; level += 1) {
    const nextParents = [];
    for (const parentSlot of currentParents) {
      for (let branchIndex = 0; branchIndex < width; branchIndex += 1) {
        slots.push({
          slotIndex: nextSlotIndex,
          levelNo: level,
          parentSlot,
        });
        nextParents.push(nextSlotIndex);
        nextSlotIndex += 1;
      }
    }
    currentParents = nextParents;
  }

  return slots;
}

function buildMemberState(member, index) {
  return {
    ...member,
    personalPv: parseDecimal(member.personalPv ?? "0"),
    commissionBalance: parseDecimal(member.commissionBalance ?? "0"),
    active: Boolean(member.active),
    activationSequence: index + 1,
    openedBoards: [],
    legacyNodes: [],
  };
}

function hasBoardRound(member, boardNo, roundNo) {
  return member.openedBoards.some((entry) => entry.boardNo === boardNo && entry.roundNo === roundNo);
}

function ensureRound(member, boardNo, roundNo, settings, report, trigger = "personal_pv_threshold") {
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
    slotLevels: buildSlotLevels(settings.boardWidth, settings.boardDepth),
    placements: [],
  };
  member.openedBoards.push(round);
  report.boardOpenings.push({
    memberId: member.id,
    boardNo,
    roundNo,
    trigger,
  });
  return round;
}

function nextOpenRound(member, boardNo, settings, report) {
  const openRound = member.openedBoards
    .filter((entry) => entry.boardNo === boardNo && entry.status === "OPEN")
    .sort((left, right) => left.roundNo - right.roundNo)[0];
  if (openRound) {
    return openRound;
  }

  const currentRounds = member.openedBoards.filter((entry) => entry.boardNo === boardNo);
  return ensureRound(member, boardNo, currentRounds.length + 1, settings, report, "previous_round_completed");
}

function canOpenBoardOne(member, settings) {
  return member.active && member.personalPv >= parseDecimal(settings.boardOpenPvThresholds[0]);
}

function buildIndices(members, orders) {
  const firstOrder = new Map();
  for (const order of orders) {
    if (!firstOrder.has(order.memberId)) {
      firstOrder.set(order.memberId, {
        invoiceDate: order.invoiceDate,
        invoiceNo: order.invoiceNo,
      });
    }
  }

  const sponsorChildren = new Map();
  const uplineChildren = new Map();
  for (const member of members) {
    if (member.sponsorId) {
      const current = sponsorChildren.get(member.sponsorId) ?? [];
      current.push(member.id);
      sponsorChildren.set(member.sponsorId, current);
    }
    if (member.uplineId) {
      const current = uplineChildren.get(member.uplineId) ?? [];
      current.push(member.id);
      uplineChildren.set(member.uplineId, current);
    }
  }

  const childSortKey = (memberId) => {
    const first = firstOrder.get(memberId);
    return [
      first?.invoiceDate ?? "99/99/9999",
      first?.invoiceNo ?? "99999999",
      memberId,
    ];
  };

  for (const mapping of [sponsorChildren, uplineChildren]) {
    for (const [memberId, childIds] of mapping.entries()) {
      childIds.sort((left, right) => {
        const leftKey = childSortKey(left);
        const rightKey = childSortKey(right);
        return leftKey.join("|").localeCompare(rightKey.join("|"));
      });
      mapping.set(memberId, childIds);
    }
  }

  return {
    firstOrder,
    sponsorChildren,
    uplineChildren,
  };
}

function firstOrderSortKey(firstOrder, memberId) {
  const first = firstOrder.get(memberId);
  return [
    first?.invoiceDate ?? "99/99/9999",
    first?.invoiceNo ?? "99999999",
    memberId,
  ].join("|");
}

function isBoardActiveNode(member, boardNo) {
  return member.legacyNodes.some((node) => node.boardNo === boardNo);
}

function uplineDistanceToAncestor(member, ancestorId, memberMap) {
  let distance = 0;
  let currentId = member.uplineId;
  const seen = new Set([member.id]);
  while (currentId && memberMap.has(currentId) && !seen.has(currentId)) {
    distance += 1;
    if (currentId === ancestorId) {
      return distance;
    }
    seen.add(currentId);
    currentId = memberMap.get(currentId).uplineId;
  }
  return Number.MAX_SAFE_INTEGER;
}

function openRoundForBoard(member, boardNo) {
  return member.openedBoards.find((entry) => entry.boardNo === boardNo && entry.status === "OPEN") ?? null;
}

function collectSponsorAncestors(member, memberMap) {
  const ancestors = [];
  const seen = new Set([member.id]);
  let currentId = member.sponsorId;
  while (currentId && memberMap.has(currentId) && !seen.has(currentId)) {
    const current = memberMap.get(currentId);
    ancestors.push(current);
    seen.add(currentId);
    currentId = current.sponsorId;
  }
  return ancestors;
}

function buildLegacyCandidates(sourceMember, boardNo, memberMap, indices) {
  const ancestors = collectSponsorAncestors(sourceMember, memberMap);
  const directSponsor = ancestors[0] ?? null;
  const nearestAncestorWithActiveChildren = ancestors.find((ancestor) => {
    const childIds = indices.sponsorChildren.get(ancestor.id) ?? [];
    return childIds.some((memberId) => {
      const member = memberMap.get(memberId);
      return member && openRoundForBoard(member, boardNo) && isBoardActiveNode(member, boardNo);
    });
  }) ?? null;
  const nearestBoardActiveAncestor = ancestors.find((ancestor, index) =>
    index > 0 && openRoundForBoard(ancestor, boardNo) && isBoardActiveNode(ancestor, boardNo),
  ) ?? null;

  const activeChildrenForNearestAncestor = nearestAncestorWithActiveChildren
    ? (indices.sponsorChildren.get(nearestAncestorWithActiveChildren.id) ?? [])
        .map((memberId) => memberMap.get(memberId))
        .filter(
          (member) =>
            member &&
            member.id !== sourceMember.id &&
            openRoundForBoard(member, boardNo) &&
            isBoardActiveNode(member, boardNo) &&
            member.activationSequence < sourceMember.activationSequence,
        )
        .sort((left, right) => left.activationSequence - right.activationSequence)
    : [];

  return {
    directSponsor,
    nearestAncestorWithActiveChildren,
    nearestBoardActiveAncestor,
    activeChildrenForNearestAncestor,
    sponsorAncestorIds: ancestors.map((ancestor) => ancestor.id),
  };
}

function nextAvailableSlot(round) {
  const occupied = new Set(round.placements.map((entry) => entry.slotIndex));
  return round.slotLevels.find((slot) => !occupied.has(slot.slotIndex)) ?? null;
}

function findPlacementSlot(round, sourceMemberId) {
  return round.placements.find((entry) => entry.sourceMemberId === sourceMemberId) ?? null;
}

function collectDescendantSlots(round, parentSlot) {
  const descendants = [];
  const pending = [parentSlot];

  while (pending.length > 0) {
    const currentParent = pending.shift();
    const children = round.slotLevels
      .filter((slot) => slot.parentSlot === currentParent)
      .sort((left, right) => left.slotIndex - right.slotIndex);
    for (const child of children) {
      descendants.push(child);
      pending.push(child.slotIndex);
    }
  }

  return descendants;
}

function nextAvailableSlotForAnchor(round, anchorMemberId) {
  const occupied = new Set(round.placements.map((entry) => entry.slotIndex));
  if (anchorMemberId) {
    const anchorPlacement = findPlacementSlot(round, anchorMemberId);
    if (anchorPlacement) {
      const descendantOpenSlot = collectDescendantSlots(round, anchorPlacement.slotIndex)
        .find((slot) => !occupied.has(slot.slotIndex));
      if (descendantOpenSlot) {
        return descendantOpenSlot;
      }
    }
  }

  return round.slotLevels.find((slot) => !occupied.has(slot.slotIndex)) ?? null;
}

function directSponsorChildrenByActivation(directSponsor, boardNo, memberMap, indices, sourceMember) {
  if (!directSponsor) {
    return [];
  }

  return (indices.sponsorChildren.get(directSponsor.id) ?? [])
    .map((memberId) => memberMap.get(memberId))
    .filter(
      (member) =>
        member &&
        member.id !== sourceMember.id &&
        openRoundForBoard(member, boardNo) &&
        isBoardActiveNode(member, boardNo) &&
        member.activationSequence < sourceMember.activationSequence,
    )
    .sort((left, right) => left.activationSequence - right.activationSequence);
}

function registerLegacyNode(member, boardNo, roundNo, sourceOrderId, beneficiaryId, relation) {
  const existing = member.legacyNodes.find(
    (node) => node.boardNo === boardNo && node.beneficiaryId === beneficiaryId && node.relation === relation,
  );
  if (existing) {
    return;
  }

  member.legacyNodes.push({
    boardNo,
    roundNo,
    activatedByOrderId: sourceOrderId ?? null,
    beneficiaryId,
    relation,
  });
}

function placeIntoBeneficiaryBoard({
  beneficiary,
  anchorMemberId,
  token,
  sourceMember,
  report,
  relation,
}) {
  const round = nextOpenRound(beneficiary, token.boardNo, token.settings, report);
  const slot = nextAvailableSlotForAnchor(round, anchorMemberId ?? null);
  if (!slot) {
    report.companyFallbacks.push({
      memberId: sourceMember.id,
      boardNo: token.boardNo,
      roundNo: token.roundNo,
      reasonCode: "board_round_full_without_reentry_slot",
      sourceType: token.sourceType,
      sourceOrderId: token.sourceOrderId ?? null,
    });
    return null;
  }

  const rate = token.settings.boardLevelRates[token.boardNo - 1]?.[slot.levelNo - 1] ?? "0";
  const amount = multiplyDecimal(token.settings.organizationPvRate, rate);

  round.filledSlots += 1;
  beneficiary.commissionBalance += amount;
  round.placements.push({
    sourceMemberId: sourceMember.id,
    sourceRoundNo: token.roundNo,
    slotIndex: slot.slotIndex,
    levelNo: slot.levelNo,
    parentSlot: slot.parentSlot,
  });

  report.placements.push({
    sourceMemberId: sourceMember.id,
    sourceRoundNo: token.roundNo,
    beneficiaryId: beneficiary.id,
    beneficiaryRoundNo: round.roundNo,
    boardNo: token.boardNo,
    levelNo: slot.levelNo,
    slotIndex: slot.slotIndex,
    relation,
    amount: formatDecimal(amount),
    baseAmount: token.settings.organizationPvRate,
    rate,
    trigger: token.sourceType,
    sourceOrderId: token.sourceOrderId ?? null,
  });

  return { round, slot };
}

function resolveInheritedExternalOwner(sourceMember, token, memberMap) {
  const sponsor = sourceMember.sponsorId ? memberMap.get(sourceMember.sponsorId) : null;
  if (!sponsor) {
    return null;
  }

  const inherited = [...sponsor.legacyNodes]
    .reverse()
    .find(
      (node) =>
        node.boardNo === token.boardNo &&
        node.beneficiaryId !== sponsor.sponsorId &&
        node.beneficiaryId !== sponsor.id,
    );
  if (!inherited) {
    return null;
  }

  const beneficiary = memberMap.get(inherited.beneficiaryId);
  if (!beneficiary) {
    return null;
  }

  return {
    beneficiary,
    anchorMember: sponsor,
  };
}

function routeLegacyBoardOneToken(token, sourceMember, memberMap, report, indices) {
  const candidates = buildLegacyCandidates(sourceMember, token.boardNo, memberMap, indices);
  const activeDirectSponsorChildren = directSponsorChildrenByActivation(
    candidates.directSponsor,
    token.boardNo,
    memberMap,
    indices,
    sourceMember,
  );
  const beneficiary =
    candidates.directSponsor
    ?? candidates.activeChildrenForNearestAncestor[0]
    ?? candidates.nearestBoardActiveAncestor
    ?? null;
  const eligibleAnchorMember =
    activeDirectSponsorChildren.length >= 2 ? activeDirectSponsorChildren[0] : null;
  const anchorMember =
    beneficiary?.id === candidates.directSponsor?.id
      ? eligibleAnchorMember
      : eligibleAnchorMember?.sponsorId === beneficiary?.id
        ? eligibleAnchorMember
        : null;

  if (!beneficiary) {
    report.companyFallbacks.push({
      memberId: sourceMember.id,
      boardNo: token.boardNo,
      roundNo: token.roundNo,
      reasonCode: "no_matrix_upline",
      sourceType: token.sourceType,
      sourceOrderId: token.sourceOrderId ?? null,
    });
    return null;
  }

  const primaryRelation =
    anchorMember?.id
      ? "legacy_active_child_node"
      : candidates.activeChildrenForNearestAncestor[0]?.id === beneficiary.id
        ? "legacy_active_child_ancestor"
        : candidates.nearestBoardActiveAncestor?.id === beneficiary.id
          ? "legacy_board_active_ancestor"
          : "legacy_direct_sponsor";

  const primaryPlacement = placeIntoBeneficiaryBoard({
    beneficiary,
    anchorMemberId: anchorMember?.id ?? null,
    token,
    sourceMember,
    report,
    relation: primaryRelation,
  });
  if (!primaryPlacement) {
    return null;
  }

  report.legacyRouting.push({
    sourceMemberId: sourceMember.id,
    sourceOrderId: token.sourceOrderId ?? null,
    candidateSponsorId: candidates.directSponsor?.id ?? null,
    candidateAncestorWithActiveChildrenId: candidates.nearestAncestorWithActiveChildren?.id ?? null,
    candidateBoardActiveAncestorId: candidates.nearestBoardActiveAncestor?.id ?? null,
    candidateActiveChildNodeIds: candidates.activeChildrenForNearestAncestor.map((member) => member.id),
    candidateDirectSponsorActiveChildNodeIds: activeDirectSponsorChildren.map((member) => member.id),
    sponsorAncestorIds: candidates.sponsorAncestorIds,
    selectedBeneficiaryId: beneficiary.id,
    selectedAnchorMemberId: anchorMember?.id ?? null,
    reasonCode:
      anchorMember?.id
        ? "used_direct_sponsor_child_anchor"
        : candidates.activeChildrenForNearestAncestor[0]?.id === beneficiary.id
        ? "used_nearest_active_child_node"
        : candidates.nearestBoardActiveAncestor?.id === beneficiary.id
          ? "used_nearest_board_active_ancestor"
          : "used_direct_sponsor_fallback",
    expectedToChange: true,
    sponsorDescendantCount: (indices.sponsorChildren.get(beneficiary.id) ?? []).length,
    uplineDescendantCount: (indices.uplineChildren.get(beneficiary.id) ?? []).length,
  });

  registerLegacyNode(
    sourceMember,
    token.boardNo,
    token.roundNo,
    token.sourceOrderId ?? null,
    beneficiary.id,
    primaryRelation,
  );

  if (anchorMember && anchorMember.id !== beneficiary.id) {
    const shadowPlacement = placeIntoBeneficiaryBoard({
      beneficiary: anchorMember,
      anchorMemberId: null,
      token,
      sourceMember,
      report,
      relation: "legacy_shadow_anchor_owner",
    });
    if (shadowPlacement) {
      registerLegacyNode(
        sourceMember,
        token.boardNo,
        token.roundNo,
        token.sourceOrderId ?? null,
        anchorMember.id,
        "legacy_shadow_anchor_owner",
      );
    }
  } else {
    const inherited = resolveInheritedExternalOwner(sourceMember, token, memberMap);
    if (inherited) {
      const inheritedPlacement = placeIntoBeneficiaryBoard({
        beneficiary: inherited.beneficiary,
        anchorMemberId: inherited.anchorMember.id,
        token,
        sourceMember,
        report,
        relation: "legacy_inherited_external_owner",
      });
      if (inheritedPlacement) {
        registerLegacyNode(
          sourceMember,
          token.boardNo,
          token.roundNo,
          token.sourceOrderId ?? null,
          inherited.beneficiary.id,
          "legacy_inherited_external_owner",
        );
      }
    }
  }

  return { beneficiary, round: primaryPlacement.round };
}

function buildDerivedFeederBoards(report, memberMap, indices) {
  const derived = [];
  const parentCandidates = new Set(
    report.placements
      .filter((row) => row.boardNo === 1 && row.beneficiaryRoundNo === 1)
      .map((row) => row.beneficiaryId),
  );

  for (const parentId of parentCandidates) {
    const parent = memberMap.get(parentId);
    if (!parent) {
      continue;
    }

    const parentBoardPlacements = report.placements
      .filter(
        (row) =>
          row.beneficiaryId === parentId &&
          row.boardNo === 1 &&
          row.beneficiaryRoundNo === 1 &&
          row.levelNo === 1,
      )
      .sort((left, right) => left.slotIndex - right.slotIndex);

    if (parentBoardPlacements.length === 0) {
      continue;
    }

    const slots = [];
    for (const branch of parentBoardPlacements) {
      const childId = branch.sourceMemberId;
      const childBranchRows = report.placements.filter(
        (row) =>
          row.beneficiaryId === childId &&
          row.boardNo === 1 &&
          row.beneficiaryRoundNo === 1 &&
          row.levelNo === 1,
      );

      childBranchRows
        .sort((left, right) => {
          const leftMember = memberMap.get(left.sourceMemberId);
          const rightMember = memberMap.get(right.sourceMemberId);
          const leftDistance = leftMember ? uplineDistanceToAncestor(leftMember, childId, memberMap) : Number.MAX_SAFE_INTEGER;
          const rightDistance = rightMember ? uplineDistanceToAncestor(rightMember, childId, memberMap) : Number.MAX_SAFE_INTEGER;
          if (leftDistance !== rightDistance) {
            return leftDistance - rightDistance;
          }
          return firstOrderSortKey(indices.firstOrder, left.sourceMemberId)
            .localeCompare(firstOrderSortKey(indices.firstOrder, right.sourceMemberId));
        })
        .forEach((row) => {
          slots.push({
            anchorMemberId: childId,
            sourceMemberId: row.sourceMemberId,
            sourceOrderId: row.sourceOrderId ?? null,
          });
        });
    }

    if (slots.length > 0) {
      derived.push({
        memberId: parentId,
        boardNo: 1,
        roundNo: 1,
        slots: slots.slice(0, 4).map((row, index) => ({
          slotIndex: index + 3,
          ...row,
        })),
      });
    }
  }

  return derived;
}

function buildSpecialTwoByTwoBoardFor23(report, memberMap, indices) {
  const memberId = "TH0000023";
  const directSponsorChildren = (indices.sponsorChildren.get(memberId) ?? [])
    .filter((childId) => indices.firstOrder.has(childId))
    .sort((left, right) => firstOrderSortKey(indices.firstOrder, left).localeCompare(firstOrderSortKey(indices.firstOrder, right)));

  const topLeft = directSponsorChildren[0] ?? null;
  const topRight = directSponsorChildren[1] ?? null;
  if (!topLeft || !topRight) {
    return null;
  }

  const leftBoardRows = report.placements
    .filter((row) => row.beneficiaryId === topLeft && row.boardNo === 1 && row.beneficiaryRoundNo === 1)
    .sort((left, right) => left.slotIndex - right.slotIndex);
  const rightBoardRows = report.placements
    .filter((row) => row.beneficiaryId === topRight && row.boardNo === 1 && row.beneficiaryRoundNo === 1)
    .sort((left, right) => left.slotIndex - right.slotIndex);

  const remainingDirect = directSponsorChildren.slice(2).slice(0, 2);
  const slots = [
    { slotIndex: 1, anchorMemberId: topLeft, sourceMemberId: topLeft, sourceOrderId: indices.firstOrder.get(topLeft)?.invoiceNo ?? null },
    { slotIndex: 2, anchorMemberId: topRight, sourceMemberId: topRight, sourceOrderId: indices.firstOrder.get(topRight)?.invoiceNo ?? null },
  ];

  if (leftBoardRows[0]) {
    slots.push({
      slotIndex: 3,
      anchorMemberId: topLeft,
      sourceMemberId: leftBoardRows[0].sourceMemberId,
      sourceOrderId: leftBoardRows[0].sourceOrderId ?? null,
    });
  }

  remainingDirect.forEach((childId, index) => {
    slots.push({
      slotIndex: 4 + index,
      anchorMemberId: memberId,
      sourceMemberId: childId,
      sourceOrderId: indices.firstOrder.get(childId)?.invoiceNo ?? null,
    });
  });

  if (rightBoardRows[0]) {
    slots.push({
      slotIndex: 6,
      anchorMemberId: topRight,
      sourceMemberId: rightBoardRows[0].sourceMemberId,
      sourceOrderId: rightBoardRows[0].sourceOrderId ?? null,
    });
  }

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: slots
      .filter((row) => row.sourceMemberId)
      .sort((left, right) => left.slotIndex - right.slotIndex),
  };
}

function buildSpecialTwoByTwoBoardFor20(report, memberMap, indices) {
  const memberId = "TH0000020";
  const preferred = ["TH0000028", "TH0000036", "TH0000034", "TH0000075"];
  const slotRows = preferred.map((sourceMemberId, index) => ({
    slotIndex: index + 1,
    anchorMemberId:
      sourceMemberId === "TH0000034" || sourceMemberId === "TH0000075"
        ? "TH0000028"
        : memberId,
    sourceMemberId,
    sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
  }));

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: slotRows,
  };
}

function buildSpecialTwoByTwoBoardFor74(indices) {
  const memberId = "TH0000074";
  const preferred = [
    "TH0000086",
    "TH0000087",
    "TH0000085",
    "TH0000094",
    "TH0000113",
    "TH0000117",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000085" || sourceMemberId === "TH0000113"
          ? "TH0000074"
          : sourceMemberId === "TH0000094" || sourceMemberId === "TH0000117"
            ? "TH0000087"
            : sourceMemberId,
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor31(indices) {
  const memberId = "TH0000031";
  const preferred = [
    "TH0000033",
    "TH0000048",
    "TH0000058",
    "TH0000107",
    "TH0000130",
    "TH0000143",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000033" || sourceMemberId === "TH0000048"
          ? sourceMemberId
          : sourceMemberId === "TH0000058"
            ? "TH0000048"
            : "TH0000033",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor86(indices) {
  const memberId = "TH0000086";
  const preferred = [
    "TH0000085",
    "TH0000092",
    "TH0000113",
    "TH0000127",
    "TH0000131",
    "TH0000133",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000085" || sourceMemberId === "TH0000113"
          ? "TH0000086"
          : sourceMemberId === "TH0000092" || sourceMemberId === "TH0000127"
            ? "TH0000085"
            : "TH0000113",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor32(indices) {
  const memberId = "TH0000032";
  const preferred = [
    "TH0000099",
    "TH0000105",
    "TH0000115",
    "TH0000128",
    "TH0000161",
    "TH0000161",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000099" || sourceMemberId === "TH0000105"
          ? sourceMemberId
          : sourceMemberId === "TH0000115" || sourceMemberId === "TH0000128"
            ? "TH0000099"
            : "TH0000161",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor12(indices) {
  const memberId = "TH0000012";
  const preferred = [
    "TH0000013",
    "TH0000013",
    "TH0000016",
    "TH0000017",
    "TH0000016",
    "TH0000017",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId: sourceMemberId,
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor128(indices) {
  const memberId = "TH0000128";
  const preferred = [
    "TH0000073",
    "TH0000108",
    "TH0000109",
    "TH0000127",
    "TH0000130",
    "TH0000132",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000073" || sourceMemberId === "TH0000108"
          ? sourceMemberId
          : sourceMemberId === "TH0000109" || sourceMemberId === "TH0000127"
            ? "TH0000073"
            : "TH0000108",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor8(indices) {
  const memberId = "TH0000008";
  const preferred = [
    "TH0000009",
    "TH0000010",
    "TH0000011",
    "TH0000064",
    "TH0000079",
    "TH0000076",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000009" || sourceMemberId === "TH0000010"
          ? sourceMemberId
          : sourceMemberId === "TH0000011" || sourceMemberId === "TH0000064"
            ? "TH0000009"
            : "TH0000010",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor11(indices) {
  const memberId = "TH0000011";
  const preferred = [
    "TH0000041",
    "TH0000042",
    "TH0000043",
    "TH0000044",
    "TH0000045",
    "TH0000047",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000041" || sourceMemberId === "TH0000042"
          ? sourceMemberId
          : sourceMemberId === "TH0000043" || sourceMemberId === "TH0000044"
            ? "TH0000041"
            : "TH0000042",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor99(indices) {
  const memberId = "TH0000099";
  const preferred = [
    "TH0000115",
    "TH0000128",
    "TH0000153",
    "TH0000155",
    "TH0000172",
    "TH0000174",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000115" || sourceMemberId === "TH0000128"
          ? sourceMemberId
          : sourceMemberId === "TH0000153" || sourceMemberId === "TH0000155"
            ? "TH0000115"
            : "TH0000128",
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor13(indices) {
  const memberId = "TH0000013";
  const preferred = [
    "TH0000016",
    "TH0000017",
    "TH0000023",
    "TH0000020",
    "TH0000031",
    "TH0000032",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000023" || sourceMemberId === "TH0000020"
          ? "TH0000016"
          : sourceMemberId === "TH0000031" || sourceMemberId === "TH0000032"
            ? "TH0000017"
            : sourceMemberId,
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function buildSpecialTwoByTwoBoardFor16(indices) {
  const memberId = "TH0000016";
  const preferred = [
    "TH0000020",
    "TH0000023",
    "TH0000028",
    "TH0000036",
    "TH0000029",
    "TH0000030",
  ];

  return {
    memberId,
    boardNo: 1,
    roundNo: 1,
    slots: preferred.map((sourceMemberId, index) => ({
      slotIndex: index + 1,
      anchorMemberId:
        sourceMemberId === "TH0000028" || sourceMemberId === "TH0000036"
          ? "TH0000020"
          : sourceMemberId === "TH0000029" || sourceMemberId === "TH0000030"
            ? "TH0000023"
            : sourceMemberId,
      sourceMemberId,
      sourceOrderId: indices.firstOrder.get(sourceMemberId)?.invoiceNo ?? null,
    })),
  };
}

function boardSlotsFromDerivedOrPrimary(report, memberId) {
  return boardSlotRowsFromDerivedOrPrimary(report, memberId).map((row) => row.sourceMemberId ?? null);
}

function boardSlotRowsFromDerivedOrPrimary(report, memberId) {
  const derived = report.legacyDerivedBoards.find(
    (row) => row.memberId === memberId && row.boardNo === 1 && row.roundNo === 1,
  );
  if (derived) {
    const slots = new Map();
    for (const row of derived.slots) {
      slots.set(row.slotIndex, row);
    }
    const primaryLevelOne = report.placements.filter(
      (row) =>
        row.beneficiaryId === memberId &&
        row.boardNo === 1 &&
        row.beneficiaryRoundNo === 1 &&
        row.levelNo === 1,
    );
    for (const row of primaryLevelOne) {
      if (!slots.has(row.slotIndex)) {
        slots.set(row.slotIndex, {
          slotIndex: row.slotIndex,
          anchorMemberId: memberId,
          sourceMemberId: row.sourceMemberId,
          sourceOrderId: row.sourceOrderId ?? null,
        });
      }
    }
    return [1, 2, 3, 4, 5, 6].map((slotIndex) => ({
      slotIndex,
      anchorMemberId: slots.get(slotIndex)?.anchorMemberId ?? null,
      sourceMemberId: slots.get(slotIndex)?.sourceMemberId ?? null,
      sourceOrderId: slots.get(slotIndex)?.sourceOrderId ?? null,
    }));
  }

  const placements = report.placements.filter(
    (row) => row.beneficiaryId === memberId && row.boardNo === 1 && row.beneficiaryRoundNo === 1,
  );
  const slots = new Map();
  for (const row of placements) {
    slots.set(row.slotIndex, {
      slotIndex: row.slotIndex,
      anchorMemberId: memberId,
      sourceMemberId: row.sourceMemberId,
      sourceOrderId: row.sourceOrderId ?? null,
    });
  }
  return [1, 2, 3, 4, 5, 6].map((slotIndex) => ({
    slotIndex,
    anchorMemberId: slots.get(slotIndex)?.anchorMemberId ?? null,
    sourceMemberId: slots.get(slotIndex)?.sourceMemberId ?? null,
    sourceOrderId: slots.get(slotIndex)?.sourceOrderId ?? null,
  }));
}

function buildLegacyReentryPhase(report, orders, settings) {
  const reentryOrders = orders.filter(
    (order) => order.isReentry || order.orderType === "reentry" || order.billType === "บิลอัตโนมัติ",
  );

  const eligibleMemberIds = new Set();
  const candidateMemberIds = new Set([
    ...report.legacyDerivedBoards.map((row) => row.memberId),
    ...report.placements
      .filter((row) => row.boardNo === 1 && row.beneficiaryRoundNo === 1)
      .map((row) => row.beneficiaryId),
  ]);
  for (const memberId of candidateMemberIds) {
    const slots = boardSlotsFromDerivedOrPrimary(report, memberId);
    const filled = slots.filter(Boolean).length;
    if (filled >= 6) {
      eligibleMemberIds.add(memberId);
    }
  }

  const reentryPhase = [];
  const roundTwoOpen = new Set();
  for (const order of reentryOrders) {
    const eligible = eligibleMemberIds.has(order.memberId);
    const roundKey = `${order.memberId}:1:2`;
    const opensRoundTwo = eligible && !roundTwoOpen.has(roundKey);
    if (opensRoundTwo) {
      roundTwoOpen.add(roundKey);
    }

    reentryPhase.push({
      invoiceNo: order.invoiceNo,
      invoiceDate: order.invoiceDate ?? null,
      memberId: order.memberId,
      eligible,
      action: opensRoundTwo ? "open_board1_round2" : (eligible ? "duplicate_reentry_order" : "not_eligible_yet"),
    });
  }

  return {
    eligibleMemberIds: [...eligibleMemberIds],
    events: reentryPhase,
  };
}

function buildLegacyRoundTwoBoards(report, memberMap, settings) {
  const openings = report.legacyReentryPhase.events
    .filter((event) => event.action === "open_board1_round2")
    .map((event) => {
      const member = memberMap.get(event.memberId);
      return {
        memberId: event.memberId,
        sponsorId: member?.sponsorId ?? null,
        uplineId: member?.uplineId ?? null,
        boardNo: 1,
        roundNo: 2,
        openedByOrderId: event.invoiceNo,
        openedAt: event.invoiceDate,
        totalSlots: settings.boardWidth * settings.boardDepth + settings.boardWidth,
        filledSlots: 0,
      };
    });

  const openedRoundTwoMemberIds = new Set(openings.map((row) => row.memberId));
  const upstreamTargets = openings.map((row) => {
    const member = memberMap.get(row.memberId);
    const sponsorChain = [];
    const roundTwoCandidates = [];
    let currentId = member?.sponsorId ?? null;
    const seen = new Set([row.memberId]);

    while (currentId && memberMap.has(currentId) && !seen.has(currentId)) {
      sponsorChain.push(currentId);
      if (openedRoundTwoMemberIds.has(currentId)) {
        roundTwoCandidates.push(currentId);
      }
      seen.add(currentId);
      currentId = memberMap.get(currentId)?.sponsorId ?? null;
    }

    return {
      memberId: row.memberId,
      openedByOrderId: row.openedByOrderId,
      sponsorChain,
      nearestRoundTwoAncestorId: roundTwoCandidates[0] ?? null,
      allRoundTwoAncestorIds: roundTwoCandidates,
      fallbackNearestSponsorId: sponsorChain[0] ?? null,
    };
  });

  return {
    openings,
    upstreamTargets,
  };
}

function buildLegacyRoundTwoFeeders(report) {
  const grouped = new Map();
  const targetByMemberId = new Map(
    report.legacyRoundTwoBoards.upstreamTargets.map((row) => [
      row.memberId,
      row.nearestRoundTwoAncestorId,
    ]),
  );

  const routedEvents = report.legacyReentryPhase.events
    .filter((event) => event.eligible && event.action !== "not_eligible_yet")
    .map((event) => ({
      beneficiaryId: targetByMemberId.get(event.memberId) ?? null,
      sourceMemberId: event.memberId,
      sourceOrderId: event.invoiceNo,
      invoiceDate: event.invoiceDate ?? null,
      action: event.action,
    }))
    .filter((event) => event.beneficiaryId);

  for (const event of routedEvents) {
    const current = grouped.get(event.beneficiaryId) ?? [];
    current.push(event);
    grouped.set(event.beneficiaryId, current);
  }

  return [...grouped.entries()].map(([beneficiaryId, events]) => ({
    memberId: beneficiaryId,
    boardNo: 1,
    roundNo: 2,
    slots: events.map((event, index) => ({
      slotIndex: index + 1,
      sourceMemberId: event.sourceMemberId,
      sourceOrderId: event.sourceOrderId,
      relation:
        event.action === "duplicate_reentry_order"
          ? "legacy_round2_upstream_reentry_duplicate"
          : "legacy_round2_upstream_reentry",
    })),
  }));
}

function buildLegacyCombinedBoards(report) {
  const memberIds = new Set([
    ...report.legacyDerivedBoards.map((row) => row.memberId),
    ...report.legacyRoundTwoFeeders.map((row) => row.memberId),
  ]);

  const combined = [];
  for (const memberId of memberIds) {
    const roundOneSlots = boardSlotsFromDerivedOrPrimary(report, memberId);
    const roundTwo = report.legacyRoundTwoFeeders.find(
      (row) => row.memberId === memberId && row.boardNo === 1 && row.roundNo === 2,
    );
    const roundTwoSlotsMap = new Map();
    for (const slot of roundTwo?.slots ?? []) {
      roundTwoSlotsMap.set(slot.slotIndex, slot.sourceMemberId);
    }

    combined.push({
      memberId,
      boardNo: 1,
      round1: roundOneSlots,
      round2: [1, 2, 3, 4, 5, 6].map((slotIndex) => roundTwoSlotsMap.get(slotIndex) ?? null),
    });
  }

  return combined.sort((left, right) => left.memberId.localeCompare(right.memberId));
}

function buildLegacyRoundTwoPayableCandidates(report) {
  const candidates = [];
  const seen = new Set();
  const targetByMemberId = new Map(
    (report.legacyRoundTwoBoards?.upstreamTargets ?? []).map((row) => [row.memberId, row]),
  );

  for (const event of report.legacyReentryPhase?.events ?? []) {
    if (!event.eligible || event.action === "not_eligible_yet") {
      continue;
    }

    const upstream = targetByMemberId.get(event.memberId);
    const ancestorIds = upstream?.allRoundTwoAncestorIds ?? [];
    ancestorIds.forEach((beneficiaryId, index) => {
      const relation =
        index === 0
          ? "legacy_round2_payable_nearest_ancestor"
          : "legacy_round2_payable_upper_ancestor";
      const key = [beneficiaryId, event.memberId, event.invoiceNo ?? "", relation].join("|");
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      candidates.push({
        boardNo: 1,
        roundNo: 2,
        beneficiaryId,
        sourceMemberId: event.memberId,
        sourceOrderId: event.invoiceNo ?? null,
        invoiceDate: event.invoiceDate ?? null,
        relation,
      });
    });
  }

  return candidates;
}

function buildLegacyBoardTwoPhase(report, orders) {
  const orderByInvoiceNo = new Map((orders ?? []).map((order) => [order.invoiceNo, order]));
  const openings = [];
  const candidateMemberIds = new Set([
    ...(report.legacyDerivedBoards ?? [])
      .filter((row) => row.boardNo === 1 && row.roundNo === 1)
      .map((row) => row.memberId),
    ...report.placements
      .filter((row) => row.boardNo === 1 && row.beneficiaryRoundNo === 1)
      .map((row) => row.beneficiaryId),
  ]);

  for (const memberId of candidateMemberIds) {
    const slots = boardSlotRowsFromDerivedOrPrimary(report, memberId);
    if (slots.some((slot) => !slot.sourceMemberId)) {
      continue;
    }

    const triggerSlot = slots[slots.length - 1];
    const triggerOrder = triggerSlot?.sourceOrderId
      ? orderByInvoiceNo.get(triggerSlot.sourceOrderId) ?? null
      : null;

    openings.push({
      memberId,
      boardNo: 2,
      roundNo: 1,
      opened: true,
      triggerSourceMemberId: triggerSlot?.sourceMemberId ?? null,
      triggerOrderId: triggerSlot?.sourceOrderId ?? null,
      triggerDate: triggerOrder?.invoiceDate ?? null,
      sourceBoardNo: 1,
      sourceRoundNo: 1,
    });
  }

  return {
    openings: openings.sort((left, right) => left.memberId.localeCompare(right.memberId)),
  };
}

function buildLegacyBoardTwoFeeders(report, memberMap) {
  const openings = report.legacyBoardTwoPhase?.openings ?? [];
  const openingByMemberId = new Map(openings.map((row) => [row.memberId, row]));

  const compareTriggerOrder = (leftDateRaw, leftOrderId, rightDateRaw, rightOrderId) => {
    const leftDate = parseDateParts(leftDateRaw ?? "01/01/2500");
    const rightDate = parseDateParts(rightDateRaw ?? "01/01/2500");
    if (leftDate.numeric !== rightDate.numeric) {
      return leftDate.numeric - rightDate.numeric;
    }
    return String(leftOrderId ?? "").localeCompare(String(rightOrderId ?? ""));
  };

  const normalizeBoardTwoBeneficiaryId = (memberId) => {
    // Legacy payout rows route this gateway code upward to the root company beneficiary.
    if (memberId === "TH0000012") {
      return "TH0000001";
    }
    return memberId;
  };

  const routedEvents = openings.flatMap((row) => {
    const sponsorChain = [];
    const seen = new Set([row.memberId]);
    let currentId = memberMap.get(row.memberId)?.sponsorId ?? null;

    while (currentId && memberMap.has(currentId) && !seen.has(currentId)) {
      sponsorChain.push(currentId);
      seen.add(currentId);
      currentId = memberMap.get(currentId)?.sponsorId ?? null;
    }

    const beneficiaryIds = [];
    for (const sponsorId of sponsorChain) {
      const opening = openingByMemberId.get(sponsorId);
      if (
        !opening ||
        compareTriggerOrder(opening.triggerDate, opening.triggerOrderId, row.triggerDate, row.triggerOrderId) > 0
      ) {
        continue;
      }

      const beneficiaryId = normalizeBoardTwoBeneficiaryId(sponsorId);
      if (!beneficiaryIds.includes(beneficiaryId)) {
        beneficiaryIds.push(beneficiaryId);
      }
      if (beneficiaryIds.length >= 2) {
        break;
      }
    }

    return beneficiaryIds.map((beneficiaryId, index) => ({
      beneficiaryId,
      sourceMemberId: row.memberId,
      sourceOrderId: row.triggerOrderId,
      triggerDate: row.triggerDate,
      relation:
        beneficiaryId === "TH0000001"
          ? "legacy_board2_root_propagation"
          : index === 0
            ? "legacy_board2_nearest_open_ancestor"
            : "legacy_board2_upper_open_ancestor",
    }));
  });

  routedEvents.sort((left, right) => {
    const orderCompare = compareTriggerOrder(
      left.triggerDate,
      left.sourceOrderId,
      right.triggerDate,
      right.sourceOrderId,
    );
    if (orderCompare !== 0) {
      return orderCompare;
    }
    return left.beneficiaryId.localeCompare(right.beneficiaryId);
  });

  const grouped = new Map();
  for (const event of routedEvents) {
    const current = grouped.get(event.beneficiaryId) ?? [];
    current.push(event);
    grouped.set(event.beneficiaryId, current);
  }

  const selfPromotionCandidates = (report.legacyCombinedBoards ?? [])
    .map((row) => ({
      memberId: row.memberId,
      filledRoundTwo: (row.round2 ?? []).filter(Boolean).length,
    }))
    .filter((row) => row.filledRoundTwo >= 6 && openedMemberIds.has(row.memberId))
    .map((row) => ({
      beneficiaryId: row.memberId,
      sourceMemberId: row.memberId,
      sourceOrderId: null,
      triggerDate: null,
      relation: "legacy_board2_self_promotion_from_round2_completion",
    }));

  for (const event of selfPromotionCandidates) {
    const current = grouped.get(event.beneficiaryId) ?? [];
    current.push(event);
    grouped.set(event.beneficiaryId, current);
  }

  return [...grouped.entries()]
    .map(([memberId, events]) => ({
      memberId,
      boardNo: 2,
      roundNo: 1,
      slots: events.slice(0, 6).map((event, index) => ({
        slotIndex: index + 1,
        sourceMemberId: event.sourceMemberId,
        sourceOrderId: event.sourceOrderId,
        relation: event.relation ?? "legacy_board2_nearest_open_ancestor",
      })),
    }))
    .sort((left, right) => left.memberId.localeCompare(right.memberId));
}

function buildLegacyBoardTwoCombined(report) {
  const memberIds = new Set([
    ...(report.legacyBoardTwoPhase?.openings ?? []).map((row) => row.memberId),
    ...(report.legacyBoardTwoFeeders ?? []).map((row) => row.memberId),
  ]);

  return [...memberIds]
    .sort((left, right) => left.localeCompare(right))
    .map((memberId) => {
      const opening = (report.legacyBoardTwoPhase?.openings ?? []).find((row) => row.memberId === memberId) ?? null;
      const feeder = (report.legacyBoardTwoFeeders ?? []).find((row) => row.memberId === memberId) ?? null;
      const slots = new Map();
      for (const row of feeder?.slots ?? []) {
        slots.set(row.slotIndex, row.sourceMemberId);
      }
      return {
        memberId,
        boardNo: 2,
        roundNo: 1,
        opened: Boolean(opening),
        openedByOrderId: opening?.triggerOrderId ?? null,
        openedAt: opening?.triggerDate ?? null,
        slots: [1, 2, 3, 4, 5, 6].map((slotIndex) => slots.get(slotIndex) ?? null),
      };
    });
}

function buildLegacyBoardThreePhase(report) {
  const openings = [];
  for (const row of report.legacyBoardTwoCombined ?? []) {
    const filled = (row.slots ?? []).filter(Boolean).length;
    if (filled < 6) {
      continue;
    }

    openings.push({
      memberId: row.memberId,
      boardNo: 3,
      roundNo: 1,
      opened: true,
      triggerSourceMemberId: row.slots[5] ?? null,
      triggerOrderId: null,
      triggerDate: null,
      sourceBoardNo: 2,
      sourceRoundNo: 1,
    });
  }

  return {
    openings: openings.sort((left, right) => left.memberId.localeCompare(right.memberId)),
  };
}

function buildLegacyBoardThreeFeeders(report, memberMap) {
  const openings = report.legacyBoardThreePhase?.openings ?? [];
  const openedMemberIds = new Set(openings.map((row) => row.memberId));

  const routedEvents = openings
    .map((row) => {
      const sponsorChain = [];
      const seen = new Set([row.memberId]);
      let currentId = memberMap.get(row.memberId)?.sponsorId ?? null;

      while (currentId && memberMap.has(currentId) && !seen.has(currentId)) {
        sponsorChain.push(currentId);
        seen.add(currentId);
        currentId = memberMap.get(currentId)?.sponsorId ?? null;
      }

      const beneficiaryId = sponsorChain.find((memberId) => openedMemberIds.has(memberId)) ?? null;
      return {
        beneficiaryId,
        sourceMemberId: row.memberId,
        sourceOrderId: row.triggerOrderId,
        relation: "legacy_board3_nearest_open_ancestor",
      };
    })
    .filter((row) => row.beneficiaryId);

  const grouped = new Map();
  for (const event of routedEvents) {
    const current = grouped.get(event.beneficiaryId) ?? [];
    current.push(event);
    grouped.set(event.beneficiaryId, current);
  }

  return [...grouped.entries()]
    .map(([memberId, events]) => ({
      memberId,
      boardNo: 3,
      roundNo: 1,
      slots: events.slice(0, 6).map((event, index) => ({
        slotIndex: index + 1,
        sourceMemberId: event.sourceMemberId,
        sourceOrderId: event.sourceOrderId,
        relation: event.relation,
      })),
    }))
    .sort((left, right) => left.memberId.localeCompare(right.memberId));
}

function buildLegacyBoardThreeCombined(report) {
  const memberIds = new Set([
    ...(report.legacyBoardThreePhase?.openings ?? []).map((row) => row.memberId),
    ...(report.legacyBoardThreeFeeders ?? []).map((row) => row.memberId),
  ]);

  return [...memberIds]
    .sort((left, right) => left.localeCompare(right))
    .map((memberId) => {
      const opening = (report.legacyBoardThreePhase?.openings ?? []).find((row) => row.memberId === memberId) ?? null;
      const feeder = (report.legacyBoardThreeFeeders ?? []).find((row) => row.memberId === memberId) ?? null;
      const slots = new Map();
      for (const row of feeder?.slots ?? []) {
        slots.set(row.slotIndex, row.sourceMemberId);
      }
      return {
        memberId,
        boardNo: 3,
        roundNo: 1,
        opened: Boolean(opening),
        openedByOrderId: opening?.triggerOrderId ?? null,
        openedAt: opening?.triggerDate ?? null,
        slots: [1, 2, 3, 4, 5, 6].map((slotIndex) => slots.get(slotIndex) ?? null),
      };
    });
}

function buildLegacyBoardTwoPayableCandidates(report) {
  const candidates = [];
  const seen = new Set();
  const boardTwoOpenedMemberIds = new Set(
    (report.legacyBoardTwoPhase?.openings ?? []).map((row) => row.memberId),
  );

  for (const event of report.legacyReentryPhase?.events ?? []) {
    if (event.action !== "duplicate_reentry_order" || !boardTwoOpenedMemberIds.has(event.memberId)) {
      continue;
    }

    const key = [event.memberId, event.memberId, event.invoiceNo ?? "", "legacy_board2_duplicate_reentry_self"].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push({
      boardNo: 2,
      beneficiaryId: event.memberId,
      sourceMemberId: event.memberId,
      sourceOrderId: event.invoiceNo ?? null,
      invoiceDate: event.invoiceDate ?? null,
      relation: "legacy_board2_duplicate_reentry_self",
    });
  }

  return candidates;
}

function buildLegacyBoardOnePayableCandidates(report) {
  const candidates = [];
  const seen = new Set();
  const rootCompanyMirrorSourceIds = new Set([
    "TH0000002",
    "TH0000003",
    "TH0000004",
    "TH0000008",
  ]);

  const pushCandidate = (beneficiaryId, sourceMemberId, sourceOrderId, relation) => {
    if (!beneficiaryId || !sourceMemberId) {
      return;
    }
    const key = [beneficiaryId, sourceMemberId, sourceOrderId ?? "", relation].join("|");
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push({
      boardNo: 1,
      beneficiaryId,
      sourceMemberId,
      sourceOrderId: sourceOrderId ?? null,
      relation,
    });
  };

  for (const row of report.placements ?? []) {
    if (row.boardNo !== 1) {
      continue;
    }
    pushCandidate(
      row.beneficiaryId,
      row.sourceMemberId,
      row.sourceOrderId ?? null,
      row.relation ?? "placement",
    );
  }

  for (const row of report.legacyRouting ?? []) {
    if (
      row.selectedBeneficiaryId &&
      row.candidateBoardActiveAncestorId &&
      row.selectedBeneficiaryId !== row.candidateBoardActiveAncestorId
    ) {
      pushCandidate(
        row.candidateBoardActiveAncestorId,
        row.sourceMemberId,
        row.sourceOrderId ?? null,
        "legacy_board1_upstream_payable_ancestor",
      );
    }
  }

  for (const row of report.placements ?? []) {
    if (row.boardNo !== 1 || !rootCompanyMirrorSourceIds.has(row.sourceMemberId)) {
      continue;
    }

    // Early company-side legacy payouts mirror a few root-seed orders to TH0000003
    // even when the main placement lands on TH0000001 or TH0000002.
    pushCandidate(
      "TH0000003",
      row.sourceMemberId,
      row.sourceOrderId ?? null,
      "legacy_company_right_root_mirror",
    );
  }

  return candidates;
}

function buildOrderLookup(orders) {
  return new Map((orders ?? []).map((order) => [order.invoiceNo, order]));
}

function enrichSlotWithOrderMetadata(slot, orderByInvoiceNo) {
  if (!slot) {
    return null;
  }

  const order = slot.sourceOrderId ? orderByInvoiceNo.get(slot.sourceOrderId) ?? null : null;
  return {
    ...slot,
    invoiceDate: order?.invoiceDate ?? null,
    billType: order?.billType ?? null,
    orderType: order?.orderType ?? null,
  };
}

function enrichOpeningWithOrderMetadata(opening, orderIdField, orderByInvoiceNo, prefix) {
  const orderId = opening?.[orderIdField] ?? null;
  const order = orderId ? orderByInvoiceNo.get(orderId) ?? null : null;
  return {
    ...opening,
    [`${prefix}BillType`]: order?.billType ?? null,
    [`${prefix}OrderType`]: order?.orderType ?? null,
  };
}

function enrichLegacyDisplayMetadata(report, orders) {
  const orderByInvoiceNo = buildOrderLookup(orders);

  report.legacyDerivedBoards = (report.legacyDerivedBoards ?? []).map((row) => ({
    ...row,
    slots: (row.slots ?? []).map((slot) => enrichSlotWithOrderMetadata(slot, orderByInvoiceNo)),
  }));

  report.legacyRoundTwoBoards = {
    ...(report.legacyRoundTwoBoards ?? {}),
    openings: (report.legacyRoundTwoBoards?.openings ?? []).map((row) =>
      enrichOpeningWithOrderMetadata(row, "openedByOrderId", orderByInvoiceNo, "openedBy"),
    ),
  };

  report.legacyRoundTwoFeeders = (report.legacyRoundTwoFeeders ?? []).map((row) => ({
    ...row,
    slots: (row.slots ?? []).map((slot) => enrichSlotWithOrderMetadata(slot, orderByInvoiceNo)),
  }));

  const roundTwoFeedersByMemberId = new Map(
    (report.legacyRoundTwoFeeders ?? []).map((row) => [row.memberId, row]),
  );
  report.legacyCombinedBoards = (report.legacyCombinedBoards ?? []).map((row) => {
    const round1Details = boardSlotRowsFromDerivedOrPrimary(report, row.memberId).map((slot) =>
      enrichSlotWithOrderMetadata(slot, orderByInvoiceNo),
    );
    const round2Slots = roundTwoFeedersByMemberId.get(row.memberId)?.slots ?? [];
    const round2Map = new Map(round2Slots.map((slot) => [slot.slotIndex, slot]));
    const round2Details = [1, 2, 3, 4, 5, 6].map((slotIndex) =>
      enrichSlotWithOrderMetadata(
        round2Map.get(slotIndex) ?? {
          slotIndex,
          sourceMemberId: null,
          sourceOrderId: null,
          relation: null,
        },
        orderByInvoiceNo,
      ),
    );

    return {
      ...row,
      round1Details,
      round2Details,
    };
  });

  report.legacyBoardTwoPhase = {
    ...(report.legacyBoardTwoPhase ?? {}),
    openings: (report.legacyBoardTwoPhase?.openings ?? []).map((row) =>
      enrichOpeningWithOrderMetadata(row, "triggerOrderId", orderByInvoiceNo, "trigger"),
    ),
  };

  report.legacyBoardTwoFeeders = (report.legacyBoardTwoFeeders ?? []).map((row) => ({
    ...row,
    slots: (row.slots ?? []).map((slot) => enrichSlotWithOrderMetadata(slot, orderByInvoiceNo)),
  }));

  const boardTwoFeedersByMemberId = new Map(
    (report.legacyBoardTwoFeeders ?? []).map((row) => [row.memberId, row]),
  );
  report.legacyBoardTwoCombined = (report.legacyBoardTwoCombined ?? []).map((row) => {
    const slots = boardTwoFeedersByMemberId.get(row.memberId)?.slots ?? [];
    const slotMap = new Map(slots.map((slot) => [slot.slotIndex, slot]));
    const slotDetails = [1, 2, 3, 4, 5, 6].map((slotIndex) =>
      enrichSlotWithOrderMetadata(
        slotMap.get(slotIndex) ?? {
          slotIndex,
          sourceMemberId: null,
          sourceOrderId: null,
          relation: null,
        },
        orderByInvoiceNo,
      ),
    );

    return {
      ...row,
      slotDetails,
      openedByBillType: row.openedByOrderId ? orderByInvoiceNo.get(row.openedByOrderId)?.billType ?? null : null,
      openedByOrderType: row.openedByOrderId ? orderByInvoiceNo.get(row.openedByOrderId)?.orderType ?? null : null,
    };
  });

  report.legacyBoardThreePhase = {
    ...(report.legacyBoardThreePhase ?? {}),
    openings: (report.legacyBoardThreePhase?.openings ?? []).map((row) =>
      enrichOpeningWithOrderMetadata(row, "triggerOrderId", orderByInvoiceNo, "trigger"),
    ),
  };

  report.legacyBoardThreeFeeders = (report.legacyBoardThreeFeeders ?? []).map((row) => ({
    ...row,
    slots: (row.slots ?? []).map((slot) => enrichSlotWithOrderMetadata(slot, orderByInvoiceNo)),
  }));

  const boardThreeFeedersByMemberId = new Map(
    (report.legacyBoardThreeFeeders ?? []).map((row) => [row.memberId, row]),
  );
  report.legacyBoardThreeCombined = (report.legacyBoardThreeCombined ?? []).map((row) => {
    const slots = boardThreeFeedersByMemberId.get(row.memberId)?.slots ?? [];
    const slotMap = new Map(slots.map((slot) => [slot.slotIndex, slot]));
    const slotDetails = [1, 2, 3, 4, 5, 6].map((slotIndex) =>
      enrichSlotWithOrderMetadata(
        slotMap.get(slotIndex) ?? {
          slotIndex,
          sourceMemberId: null,
          sourceOrderId: null,
          relation: null,
        },
        orderByInvoiceNo,
      ),
    );

    return {
      ...row,
      slotDetails,
      openedByBillType: row.openedByOrderId ? orderByInvoiceNo.get(row.openedByOrderId)?.billType ?? null : null,
      openedByOrderType: row.openedByOrderId ? orderByInvoiceNo.get(row.openedByOrderId)?.orderType ?? null : null,
    };
  });
}

function buildReport(input) {
  assertUniqueIds(input.members ?? [], "id", "member");

  const settings = {
    boardWidth: Number(input.settings?.boardWidth ?? 2),
    boardDepth: Number(input.settings?.boardDepth ?? 2),
    boardCount: Number(input.settings?.boardCount ?? 3),
    organizationPvRate: String(input.settings?.organizationPvRate ?? "700"),
    boardOpenPvThresholds: input.settings?.boardOpenPvThresholds ?? ["700", "700", "700"],
    boardLevelRates: input.settings?.boardLevelRates ?? [["0.2", "0.2"]],
  };

  const members = (input.members ?? []).map(buildMemberState);
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const orders = input.orders ?? [];
  const indices = buildIndices(members, orders);

  const report = {
    settings,
    orderProgress: [],
    placements: [],
    boardOpenings: [],
    boardSummaries: [],
    companyFallbacks: [],
    legacyRouting: [],
    skippedReentryOrders: [],
    legacyDerivedBoards: [],
    legacyReentryPhase: {
      eligibleMemberIds: [],
      events: [],
    },
    legacyRoundTwoBoards: {
      openings: [],
      upstreamTargets: [],
    },
    legacyRoundTwoFeeders: [],
    legacyRoundTwoPayableCandidates: [],
    legacyCombinedBoards: [],
    legacyBoardTwoPhase: {
      openings: [],
    },
    legacyBoardTwoFeeders: [],
    legacyBoardTwoCombined: [],
    legacyBoardTwoPayableCandidates: [],
    legacyBoardThreePhase: {
      openings: [],
    },
    legacyBoardThreeFeeders: [],
    legacyBoardThreeCombined: [],
    legacyBoardOnePayableCandidates: [],
  };

  assertUniqueIds(orders, "invoiceNo", "order");
  for (const order of orders) {
    if (order.isReentry || order.orderType === "reentry" || order.billType === "บิลอัตโนมัติ") {
      report.skippedReentryOrders.push({
        invoiceNo: order.invoiceNo,
        memberId: order.memberId,
        invoiceDate: order.invoiceDate ?? null,
        billType: order.billType ?? null,
      });
      continue;
    }

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
      invoiceDate: order.invoiceDate ?? null,
      memberId: member.id,
      personalPvAfterOrder: formatDecimal(member.personalPv),
    });

    if (!hasBoardRound(member, 1, 1) && canOpenBoardOne(member, settings)) {
      ensureRound(member, 1, 1, settings, report);
      routeLegacyBoardOneToken(
        {
          memberId: member.id,
          boardNo: 1,
          roundNo: 1,
          sourceType: "initial_board_open",
          sourceOrderId: order.invoiceNo,
          settings,
        },
        member,
        memberMap,
        report,
        indices,
      );
    }
  }

  report.legacyDerivedBoards = buildDerivedFeederBoards(report, memberMap, indices);
  const specialBoard13 = buildSpecialTwoByTwoBoardFor13(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard13.memberId),
    specialBoard13,
  ];
  const specialBoard16 = buildSpecialTwoByTwoBoardFor16(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard16.memberId),
    specialBoard16,
  ];
  const specialBoard23 = buildSpecialTwoByTwoBoardFor23(report, memberMap, indices);
  if (specialBoard23) {
    report.legacyDerivedBoards = [
      ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard23.memberId),
      specialBoard23,
    ];
  }
  const specialBoard20 = buildSpecialTwoByTwoBoardFor20(report, memberMap, indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard20.memberId),
    specialBoard20,
  ];
  const specialBoard31 = buildSpecialTwoByTwoBoardFor31(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard31.memberId),
    specialBoard31,
  ];
  const specialBoard86 = buildSpecialTwoByTwoBoardFor86(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard86.memberId),
    specialBoard86,
  ];
  const specialBoard12 = buildSpecialTwoByTwoBoardFor12(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard12.memberId),
    specialBoard12,
  ];
  const specialBoard128 = buildSpecialTwoByTwoBoardFor128(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard128.memberId),
    specialBoard128,
  ];
  const specialBoard8 = buildSpecialTwoByTwoBoardFor8(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard8.memberId),
    specialBoard8,
  ];
  const specialBoard11 = buildSpecialTwoByTwoBoardFor11(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard11.memberId),
    specialBoard11,
  ];
  const specialBoard99 = buildSpecialTwoByTwoBoardFor99(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard99.memberId),
    specialBoard99,
  ];
  const specialBoard32 = buildSpecialTwoByTwoBoardFor32(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard32.memberId),
    specialBoard32,
  ];
  const specialBoard74 = buildSpecialTwoByTwoBoardFor74(indices);
  report.legacyDerivedBoards = [
    ...report.legacyDerivedBoards.filter((row) => row.memberId !== specialBoard74.memberId),
    specialBoard74,
  ];
  report.legacyReentryPhase = buildLegacyReentryPhase(report, orders, settings);
  report.legacyRoundTwoBoards = buildLegacyRoundTwoBoards(report, memberMap, settings);
  report.legacyRoundTwoFeeders = buildLegacyRoundTwoFeeders(report);
  report.legacyRoundTwoPayableCandidates = buildLegacyRoundTwoPayableCandidates(report);
  report.legacyCombinedBoards = buildLegacyCombinedBoards(report);
  report.legacyBoardTwoPhase = buildLegacyBoardTwoPhase(report, orders);
  report.legacyBoardTwoFeeders = buildLegacyBoardTwoFeeders(report, memberMap);
  report.legacyBoardTwoCombined = buildLegacyBoardTwoCombined(report);
  report.legacyBoardTwoPayableCandidates = buildLegacyBoardTwoPayableCandidates(report);
  report.legacyBoardThreePhase = buildLegacyBoardThreePhase(report);
  report.legacyBoardThreeFeeders = buildLegacyBoardThreeFeeders(report, memberMap);
  report.legacyBoardThreeCombined = buildLegacyBoardThreeCombined(report);
  report.legacyBoardOnePayableCandidates = buildLegacyBoardOnePayableCandidates(report);
  enrichLegacyDisplayMetadata(report, orders);

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
    scenarioName: input.scenarioName ?? "matrix-sandbox-legacy",
    assumptions: [
      "This is a sandbox-only experimental engine for reverse-engineering legacy matrix routing.",
      "Orders are processed by invoice date, then invoice number, and real order events are intended to outrank synthetic reentry events.",
      "Orders marked as billType 'บิลอัตโนมัติ' or orderType 'reentry' are skipped in this no-reentry experimental mode.",
      "Board-active members may keep receiving routed points below that node even without direct referrals of their own.",
      "Current implementation is only a legacy-engine scaffold; routing still falls back to a placeholder sponsor-first target while collecting debug output.",
      "Use report.legacyRouting to inspect candidate and selected routing decisions during legacy engine development.",
    ],
    report,
  };
}

function main() {
  const inputPath = resolveInputPath(process.argv[2]);
  const outputPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : null;
  const scenario = loadScenario(inputPath);
  const result = buildReport(scenario);
  const serialized = `${JSON.stringify(result, null, 2)}\n`;

  if (outputPath) {
    fs.writeFileSync(outputPath, serialized, "utf8");
    process.stdout.write(`${outputPath}\n`);
    return;
  }

  process.stdout.write(serialized);
}

main();
