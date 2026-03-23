-- Snapshot pool rate config onto order items so approved orders do not change
-- their pool contribution when package config is edited later.

alter table "OrderItem"
  add column "poolRateMode" "PoolRateMode" not null default 'DEFAULT_50_PERCENT',
  add column "unitPoolRate" decimal(10,8) not null default 0;

update "OrderItem" oi
set
  "poolRateMode" = coalesce(pkg."poolRateMode", 'DEFAULT_50_PERCENT'::"PoolRateMode"),
  "unitPoolRate" = coalesce(pkg."poolRate", 0)
from "Package" pkg
where oi."packageId" = pkg."id";
