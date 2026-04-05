#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "runtime", "allsaletest02042026-daily-report.json");
const SPONSOR_MAP_PATH = path.join(ROOT, "runtime", "allsaletest02042026-sponsor-map.tsv");
const OUTPUT_JSON_PATH = path.join(ROOT, "runtime", "allsaletest02042026-tree-report.json");
const OUTPUT_MD_PATH = path.join(ROOT, "runtime", "allsaletest02042026-tree-report.md");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function padInvoice(invoiceNo) {
  return String(invoiceNo || "").padStart(8, "0");
}

function compareInvoice(a, b) {
  return padInvoice(a).localeCompare(padInvoice(b));
}

function flattenOrders(report) {
  const orders = [];

  for (const day of report.days || []) {
    for (const order of day.normalOrders || []) {
      orders.push({
        ...order,
        orderKind: "normal",
        sourceDate: day.date,
      });
    }

    for (const order of day.expectedAutoOrders || []) {
      orders.push({
        ...order,
        orderKind: "auto",
        sourceDate: day.date,
      });
    }
  }

  return orders.sort((left, right) => compareInvoice(left.invoiceNo, right.invoiceNo));
}

function toShortOrder(order) {
  return {
    invoiceNo: order.invoiceNo,
    invoiceDate: order.invoiceDate,
    orderKind: order.orderKind,
    billType: order.billType,
    pv: order.pv,
    amount: order.amount,
    sourceDate: order.sourceDate,
  };
}

function renderMemberNode(node, depth = 0, lines = []) {
  const indent = "  ".repeat(depth);
  const normalText =
    node.normalOrders.length > 0
      ? node.normalOrders.map((order) => `${order.invoiceNo}`).join(", ")
      : "-";
  const autoText =
    node.autoOrders.length > 0
      ? node.autoOrders.map((order) => `${order.invoiceNo}`).join(", ")
      : "-";

  lines.push(
    `${indent}- ${node.memberCode} | sponsor=${node.sponsorCode || "-"} | normal=${normalText} | auto=${autoText}`,
  );

  for (const child of node.children) {
    renderMemberNode(child, depth + 1, lines);
  }

  return lines;
}

async function main() {
  const report = readJson(SOURCE_PATH);
  const orders = flattenOrders(report);
  const memberCodes = [...new Set(orders.map((order) => order.memberId).filter(Boolean))];
  const rawUsers = fs.readFileSync(SPONSOR_MAP_PATH, "utf8");
  const users = rawUsers
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [memberCode, sponsorCode] = line.split("\t");
      return {
        memberCode,
        sponsor: sponsorCode ? { memberCode: sponsorCode } : null,
      };
    });

  const userByCode = new Map(
    users
      .filter((user) => memberCodes.includes(user.memberCode))
      .map((user) => [user.memberCode, user]),
  );

  const memberRows = memberCodes
    .map((memberCode) => {
      const memberOrders = orders.filter((order) => order.memberId === memberCode);
      const normalOrders = memberOrders.filter((order) => order.orderKind === "normal");
      const autoOrders = memberOrders.filter((order) => order.orderKind === "auto");
      const user = userByCode.get(memberCode) || null;
      const firstInvoiceNo = memberOrders[0]?.invoiceNo || null;

      return {
        memberCode,
        sponsorCode: user?.sponsor?.memberCode || null,
        firstInvoiceNo,
        normalOrders: normalOrders.map(toShortOrder),
        autoOrders: autoOrders.map(toShortOrder),
        directChildren: [],
        children: [],
      };
    })
    .sort((left, right) => compareInvoice(left.firstInvoiceNo, right.firstInvoiceNo));

  const rowByCode = new Map(memberRows.map((row) => [row.memberCode, row]));

  for (const row of memberRows) {
    if (row.sponsorCode && rowByCode.has(row.sponsorCode)) {
      rowByCode.get(row.sponsorCode).directChildren.push(row.memberCode);
    }
  }

  for (const row of memberRows) {
    row.directChildren.sort((left, right) => {
      const leftRow = rowByCode.get(left);
      const rightRow = rowByCode.get(right);
      return compareInvoice(leftRow?.firstInvoiceNo, rightRow?.firstInvoiceNo);
    });
    row.children = row.directChildren.map((childCode) => rowByCode.get(childCode));
  }

  const roots = memberRows.filter(
    (row) => !row.sponsorCode || !rowByCode.has(row.sponsorCode),
  );

  const treeLines = [];
  for (const root of roots) {
    renderMemberNode(root, 0, treeLines);
  }

  const outputJson = {
    sourceWorkbook: report.sourceWorkbook,
    normalOrderCount: report.normalOrderCount,
    expectedAutoOrderCount: report.expectedAutoOrderCount,
    memberCount: memberRows.length,
    roots: roots.map((row) => row.memberCode),
    members: memberRows.map((row) => ({
      memberCode: row.memberCode,
      sponsorCode: row.sponsorCode,
      firstInvoiceNo: row.firstInvoiceNo,
      directChildren: row.directChildren,
      normalOrders: row.normalOrders,
      autoOrders: row.autoOrders,
    })),
    treeLines,
  };

  const markdown = [
    "# allsaletest02042026 Tree Report",
    "",
    `- sourceWorkbook: ${report.sourceWorkbook}`,
    `- normalOrderCount: ${report.normalOrderCount}`,
    `- expectedAutoOrderCount: ${report.expectedAutoOrderCount}`,
    `- memberCount: ${memberRows.length}`,
    "",
    "## Tree",
    "",
    ...treeLines,
    "",
    "## Member Table",
    "",
    "| Member | Sponsor | First Invoice | Normal Bills | Auto Bills | Direct Children |",
    "| --- | --- | --- | --- | --- | --- |",
    ...memberRows.map((row) => {
      const normalText =
        row.normalOrders.length > 0
          ? row.normalOrders.map((order) => order.invoiceNo).join(", ")
          : "-";
      const autoText =
        row.autoOrders.length > 0
          ? row.autoOrders.map((order) => order.invoiceNo).join(", ")
          : "-";
      const childrenText =
        row.directChildren.length > 0 ? row.directChildren.join(", ") : "-";

      return `| ${row.memberCode} | ${row.sponsorCode || "-"} | ${row.firstInvoiceNo || "-"} | ${normalText} | ${autoText} | ${childrenText} |`;
    }),
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(outputJson, null, 2));
  fs.writeFileSync(OUTPUT_MD_PATH, markdown);

  console.log(
    JSON.stringify(
      {
        outputJsonPath: OUTPUT_JSON_PATH,
        outputMarkdownPath: OUTPUT_MD_PATH,
        memberCount: memberRows.length,
        rootCount: roots.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
