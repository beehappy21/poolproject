const { PrismaClient } = require("@prisma/client");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/poolproject?schema=public";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000";
const RUN_SUFFIX = Date.now().toString().slice(-8);
const MEMBER_PASSWORD = "smokepass1234";

async function request(path, options = {}) {
  const target = new URL(`${API_BASE_URL}${path}`);
  const transport = target.protocol === "https:" ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;

  const response = await new Promise((resolve, reject) => {
    const req = transport.request(
      target,
      {
        method: options.method || "GET",
        headers: {
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 500,
            body: raw,
          });
        });
      },
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });

  const parsed = response.body ? JSON.parse(response.body) : null;
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(parsed?.message || `${response.statusCode} request failed for ${path}`);
  }

  return parsed;
}

async function loginAdmin() {
  const session = await request("/auth/login", {
    method: "POST",
    body: {
      identifier: "ALICE",
      password: "dev-password",
    },
  });

  return session.accessToken;
}

async function main() {
  await request("/health");
  const token = await loginAdmin();

  const supplier = await prisma.supplier.create({
    data: {
      code: `FIRMSUP${RUN_SUFFIX}`,
      name: `Firm Supplier ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const category = await prisma.productCategory.create({
    data: {
      supplierId: supplier.id,
      code: "firm",
      name: `Firm ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const product = await prisma.product.create({
    data: {
      supplierId: supplier.id,
      categoryId: category.id,
      code: `FIRMPROD${RUN_SUFFIX}`,
      name: `Firm Product ${RUN_SUFFIX}`,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const detail = await prisma.productDetail.create({
    data: {
      productId: product.id,
      code: `FIRMDET${RUN_SUFFIX}`,
      name: `Firm Detail ${RUN_SUFFIX}`,
      costPriceUsdt: "20",
      memberPriceUsdt: "100",
      retailPriceUsdt: "100",
      pv: "100",
      poolRateMode: "DISABLED",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
      dcwSpendEnabled: false,
      dcwUsageAmount: "0",
      dcwCashRewardRate: "0",
      dcwShoppingRewardRate: "0",
      firmEnabled: true,
      firmDcwRewardAmount: "60",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const pkg = await prisma.package.create({
    data: {
      code: `FIRMPKG${RUN_SUFFIX}`,
      name: `Firm Package ${RUN_SUFFIX}`,
      costPriceUsdt: "20",
      memberPriceUsdt: "100",
      retailPriceUsdt: "100",
      priceUsdt: "100",
      pv: "100",
      poolRateMode: "DISABLED",
      poolRate: "0",
      poolCapMultiple: "0",
      commissionCapScope: "POOL_ONLY",
      commissionCapMultiple: "0",
      dcwSpendEnabled: false,
      dcwUsageAmount: "0",
      dcwUsageAmountOverridden: false,
      dcwCashRewardRate: "0",
      dcwShoppingRewardRate: "0",
      activeDays: 30,
      earningCapType: "FIXED_AMOUNT",
      earningCapAmount: "300",
      status: "ACTIVE",
      packageItems: {
        create: [
          {
            productDetailId: detail.id,
            qty: 1,
            unitCostPriceUsdt: "20",
            unitMemberPriceUsdt: "100",
            unitRetailPriceUsdt: "100",
            unitPv: "100",
            lineCostPriceUsdt: "20",
            lineMemberPriceUsdt: "100",
            lineRetailPriceUsdt: "100",
            linePv: "100",
          },
        ],
      },
    },
    select: { id: true },
  });

  const member = await request("/members", {
    method: "POST",
    body: {
      memberCode: `FIRMSMK${RUN_SUFFIX}`,
      name: `Firm Smoke ${RUN_SUFFIX}`,
      email: `firm.smoke.${RUN_SUFFIX}@example.com`,
      sponsorCode: "ALICE",
      password: MEMBER_PASSWORD,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: BigInt(member.memberId) },
    update: {
      firmBalance: "150",
      discountBalance: "0",
      shoppingBalance: "0",
    },
    create: {
      userId: BigInt(member.memberId),
      firmBalance: "150",
      discountBalance: "0",
      shoppingBalance: "0",
    },
  });

  const order = await request("/orders", {
    method: "POST",
    token,
    body: {
      userId: member.memberId,
      items: [
        {
          productDetailId: detail.id.toString(),
          quantity: "1",
        },
      ],
      fulfillmentMethod: "branch_pickup",
      pickupBranchName: "Firm Counter",
      firmWalletAmount: "100",
    },
  });

  const wallet = await prisma.wallet.findUnique({
    where: { userId: BigInt(member.memberId) },
    select: {
      firmBalance: true,
      discountBalance: true,
    },
  });

  const walletRows = await prisma.walletTransaction.findMany({
    where: {
      userId: BigInt(member.memberId),
      refType: "order",
      refId: BigInt(order.orderId),
    },
    orderBy: [{ id: "asc" }],
    select: {
      txType: true,
      amount: true,
      balanceBucket: true,
    },
  });

  const firmDebit = walletRows.find((row) => row.txType === "FIRM_PRODUCT_DEBIT");
  const firmDcwCredit = walletRows.find((row) => row.txType === "FIRM_DCW_CREDIT");

  const pass =
    order.status === "paid" &&
    order.approvalStatus === "pending" &&
    order.totalUsdt === "100" &&
    order.cashDueUsdt === "0" &&
    order.dcwAppliedUsdt === "0" &&
    order.walletAppliedUsdt === "0" &&
    wallet?.firmBalance?.toString() === "50" &&
    wallet?.discountBalance?.toString() === "60" &&
    firmDebit?.amount?.toString() === "100" &&
    firmDebit?.balanceBucket === "FIRM" &&
    firmDcwCredit?.amount?.toString() === "60" &&
    firmDcwCredit?.balanceBucket === "DISCOUNT";

  const output = {
    scenario: "firm_wallet_redemption_smoke",
    pass,
    order,
    wallet: {
      firmBalance: wallet?.firmBalance?.toString() || null,
      discountBalance: wallet?.discountBalance?.toString() || null,
    },
    walletRows: walletRows.map((row) => ({
      txType: row.txType,
      amount: row.amount.toString(),
      balanceBucket: row.balanceBucket,
    })),
    createdRefs: {
      supplierId: supplier.id.toString(),
      categoryId: category.id.toString(),
      productId: product.id.toString(),
      productDetailId: detail.id.toString(),
      packageId: pkg.id.toString(),
      memberId: member.memberId,
    },
  };

  console.log(JSON.stringify(output, null, 2));

  if (!pass) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
