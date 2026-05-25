update "Product"
set "description" = 'Commission baseline product 1000 THB / 200 PV',
    "updatedAt" = now()
where code = 'COMMTESTPROD';

update "ProductDetail"
set "name" = 'test',
    "shortDescription" = '1000 THB / 200 PV',
    "description" = 'Commission baseline product 1000 THB / 200 PV',
    "memberPriceUsdt" = 1000,
    "retailPriceUsdt" = 1000,
    "costPriceUsdt" = 400,
    pv = 200,
    "earningCapAmount" = 10000,
    "updatedAt" = now()
where code = 'COMMTEST1000';

update "Package"
set "name" = 'test package',
    "costPriceUsdt" = 400,
    "memberPriceUsdt" = 1000,
    "retailPriceUsdt" = 1000,
    "priceUsdt" = 1000,
    pv = 200,
    "earningCapAmount" = 10000,
    "updatedAt" = now()
where code = 'COMMTESTPKG1000';

update "PackageItem"
set "unitCostPriceUsdt" = 400,
    "unitMemberPriceUsdt" = 1000,
    "unitRetailPriceUsdt" = 1000,
    "unitPv" = 200,
    "lineCostPriceUsdt" = 400,
    "lineMemberPriceUsdt" = 1000,
    "lineRetailPriceUsdt" = 1000,
    "linePv" = 200,
    "updatedAt" = now()
where "packageId" = (select id from "Package" where code = 'COMMTESTPKG1000')
  and "productDetailId" = (select id from "ProductDetail" where code = 'COMMTEST1000');

insert into "Product" (
  "supplierId", "categoryId", "code", "name", "description", "status", "createdAt", "updatedAt"
)
select s.id, c.id, 'COMMTESTPROD650', 'test 650', 'Commission baseline product 650 THB / 100 PV', 'ACTIVE', now(), now()
from "Supplier" s
join "ProductCategory" c on c."supplierId" = s.id and c.code = 'COMMTESTCAT'
where s.code = 'COMMTESTSUP'
  and not exists (select 1 from "Product" p where p.code = 'COMMTESTPROD650');

update "Product"
set "name" = 'test 650',
    "description" = 'Commission baseline product 650 THB / 100 PV',
    "updatedAt" = now()
where code = 'COMMTESTPROD650';

insert into "ProductDetail" (
  "productId", "code", "name", "shortDescription", "description", "memberPriceUsdt", "retailPriceUsdt", "costPriceUsdt", pv,
  "poolRateMode", "poolRate", "poolCapMultiple", "commissionCapScope", "commissionCapMultiple", "activeDays", "earningCapAmount",
  "salesChannelMode", "status", "createdAt", "updatedAt"
)
select p.id, 'COMMTEST650', 'test 650', '650 THB / 100 PV', 'Commission baseline product 650 THB / 100 PV',
       650, 650, 260, 100, 'DEFAULT_50_PERCENT', 0, 0, 'ALL_COMMISSIONS', 0, 30, 5000, 'WAP_CATALOG', 'ACTIVE', now(), now()
from "Product" p
where p.code = 'COMMTESTPROD650'
  and not exists (select 1 from "ProductDetail" d where d.code = 'COMMTEST650');

update "ProductDetail"
set "name" = 'test 650',
    "shortDescription" = '650 THB / 100 PV',
    "description" = 'Commission baseline product 650 THB / 100 PV',
    "memberPriceUsdt" = 650,
    "retailPriceUsdt" = 650,
    "costPriceUsdt" = 260,
    pv = 100,
    "earningCapAmount" = 5000,
    "updatedAt" = now()
where code = 'COMMTEST650';

insert into "Package" (
  "code", "name", "costPriceUsdt", "memberPriceUsdt", "retailPriceUsdt", "priceUsdt", pv,
  "poolRateMode", "poolRate", "poolCapMultiple", "commissionCapScope", "commissionCapMultiple", "activeDays",
  "earningCapType", "earningCapAmount", "status", "createdAt", "updatedAt"
)
select 'COMMTESTPKG650', 'test package 650', 260, 650, 650, 650, 100,
       'DEFAULT_50_PERCENT', 0, 0, 'ALL_COMMISSIONS', 0, 30, 'FIXED_AMOUNT', 5000, 'ACTIVE', now(), now()
where not exists (select 1 from "Package" pkg where pkg.code = 'COMMTESTPKG650');

update "Package"
set "name" = 'test package 650',
    "costPriceUsdt" = 260,
    "memberPriceUsdt" = 650,
    "retailPriceUsdt" = 650,
    "priceUsdt" = 650,
    pv = 100,
    "earningCapAmount" = 5000,
    "updatedAt" = now()
where code = 'COMMTESTPKG650';

insert into "PackageItem" (
  "packageId", "productDetailId", qty, "unitCostPriceUsdt", "unitMemberPriceUsdt", "unitRetailPriceUsdt", "unitPv", "unitPoolRate",
  "lineCostPriceUsdt", "lineMemberPriceUsdt", "lineRetailPriceUsdt", "linePv", "createdAt", "updatedAt"
)
select pkg.id, d.id, 1, 260, 650, 650, 100, 0, 260, 650, 650, 100, now(), now()
from "Package" pkg
join "ProductDetail" d on d.code = 'COMMTEST650'
where pkg.code = 'COMMTESTPKG650'
  and not exists (
    select 1 from "PackageItem" pi where pi."packageId" = pkg.id and pi."productDetailId" = d.id
  );

update "PackageItem"
set "unitCostPriceUsdt" = 260,
    "unitMemberPriceUsdt" = 650,
    "unitRetailPriceUsdt" = 650,
    "unitPv" = 100,
    "lineCostPriceUsdt" = 260,
    "lineMemberPriceUsdt" = 650,
    "lineRetailPriceUsdt" = 650,
    "linePv" = 100,
    "updatedAt" = now()
where "packageId" = (select id from "Package" where code = 'COMMTESTPKG650')
  and "productDetailId" = (select id from "ProductDetail" where code = 'COMMTEST650');
