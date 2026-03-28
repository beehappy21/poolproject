-- Stephub compatibility read models for poolproject
-- Apply against the poolproject PostgreSQL database.

begin;

drop view if exists stephub_categories_v1 cascade;
drop view if exists stephub_products_v1 cascade;
drop view if exists stephub_suppliers_v1 cascade;
drop view if exists stephub_packages_v1 cascade;
drop view if exists stephub_package_items_v1 cascade;
drop view if exists stephub_order_items_v1 cascade;
drop view if exists stephub_orders_v1 cascade;
drop view if exists stephub_members_v1 cascade;

create view stephub_suppliers_v1 as
select
  s."id" as source_supplier_id,
  s."id"::bigint as id,
  s."code" as code,
  s."name" as name,
  s."status"::text as status,
  s."createdAt" as created_at,
  s."updatedAt" as updated_at,
  null::text as slug,
  null::text as description,
  null::text as image_url,
  false as is_featured,
  0 as sort_order
from "Supplier" s;

create view stephub_categories_v1 as
select
  c."id" as source_category_id,
  c."supplierId" as source_supplier_id,
  c."id"::bigint as id,
  c."code" as code,
  c."name" as name,
  coalesce(nullif(c."name", ''), 'Category') as display_name,
  c."status"::text as status,
  s."name" as supplier_name,
  s."code" as supplier_code,
  c."createdAt" as created_at,
  c."updatedAt" as updated_at,
  null::text as slug,
  null::text as description,
  null::text as image_url,
  '[]'::jsonb as audience,
  false as is_featured,
  0 as sort_order
from "ProductCategory" c
join "Supplier" s on s."id" = c."supplierId";

create view stephub_products_v1 as
select
  pd."id" as source_product_detail_id,
  p."id" as source_product_id,
  c."id" as source_category_id,
  s."id" as source_supplier_id,
  pd."id"::bigint as id,
  pd."code" as code,
  pd."name" as name,
  p."code" as product_code,
  p."name" as product_name,
  c."code" as category_code,
  c."name" as category_name,
  s."code" as supplier_code,
  s."name" as supplier_name,
  pd."status"::text as status,
  coalesce(pd."memberPriceUsdt", 0)::numeric(18,8) as price,
  nullif(pd."retailPriceUsdt", 0)::numeric(18,8) as old_price,
  coalesce(pd."pv", 0)::numeric(18,8) as pv,
  coalesce(pd."youtubeUrl", '') as youtube_url,
  case
    when coalesce(pd."primaryImageUrl", '') <> '' then pd."primaryImageUrl"
    when cardinality(pd."imageUrls") > 0 then pd."imageUrls"[1]
    else null
  end as image_url,
  to_jsonb(coalesce(pd."imageUrls", array[]::text[])) as images,
  jsonb_build_array(c."name") as categories,
  to_jsonb(coalesce(c."audienceTags", array[]::text[])) as audience,
  coalesce(pd."description", pd."shortDescription", p."description", '') as description,
  coalesce(pd."ratingAvg", 0)::numeric(10,2) as rating,
  coalesce(pd."ratingCount", 0)::integer as rating_count,
  null::integer as quantity,
  null::text as promotion,
  pd."isNew" as is_new,
  pd."isTop" as is_top,
  pd."isFeatured" as is_featured,
  pd."isBestSeller" as is_best_seller,
  case when pd."status"::text = 'ACTIVE' then true else false end as is_available,
  '[]'::jsonb as tags,
  '[]'::jsonb as colors,
  '[]'::jsonb as sizes,
  pd."createdAt" as created_at,
  pd."updatedAt" as updated_at
from "ProductDetail" pd
join "Product" p on p."id" = pd."productId"
join "ProductCategory" c on c."id" = p."categoryId"
join "Supplier" s on s."id" = p."supplierId";

create view stephub_packages_v1 as
select
  pkg."id" as source_package_id,
  pkg."id"::bigint as id,
  pkg."code" as code,
  pkg."name" as name,
  pkg."status"::text as status,
  pkg."priceUsdt"::numeric(18,8) as price,
  pkg."memberPriceUsdt"::numeric(18,8) as member_price,
  pkg."retailPriceUsdt"::numeric(18,8) as retail_price,
  pkg."costPriceUsdt"::numeric(18,8) as cost_price,
  pkg."pv"::numeric(18,8) as pv,
  pkg."poolRate"::numeric(10,8) as pool_rate,
  pkg."activeDays" as active_days,
  pkg."earningCapType"::text as earning_cap_type,
  pkg."earningCapAmount"::numeric(18,8) as earning_cap_amount,
  count(pi."id")::integer as item_count,
  coalesce(sum(pi."qty"), 0)::integer as total_units,
  pkg."createdAt" as created_at,
  pkg."updatedAt" as updated_at
from "Package" pkg
left join "PackageItem" pi on pi."packageId" = pkg."id"
group by
  pkg."id",
  pkg."code",
  pkg."name",
  pkg."status",
  pkg."priceUsdt",
  pkg."memberPriceUsdt",
  pkg."retailPriceUsdt",
  pkg."costPriceUsdt",
  pkg."pv",
  pkg."poolRate",
  pkg."activeDays",
  pkg."earningCapType",
  pkg."earningCapAmount",
  pkg."createdAt",
  pkg."updatedAt";

create view stephub_package_items_v1 as
select
  pi."id" as source_package_item_id,
  pi."id"::bigint as id,
  pi."packageId" as source_package_id,
  pd."id" as source_product_detail_id,
  p."id" as source_product_id,
  s."id" as source_supplier_id,
  c."id" as source_category_id,
  pd."code" as product_detail_code,
  pd."name" as product_detail_name,
  p."code" as product_code,
  p."name" as product_name,
  c."name" as category_name,
  s."name" as supplier_name,
  pi."qty" as qty,
  pi."unitMemberPriceUsdt"::numeric(18,8) as unit_member_price,
  pi."unitRetailPriceUsdt"::numeric(18,8) as unit_retail_price,
  pi."unitPv"::numeric(18,8) as unit_pv,
  pi."lineMemberPriceUsdt"::numeric(18,8) as line_member_price,
  pi."lineRetailPriceUsdt"::numeric(18,8) as line_retail_price,
  pi."linePv"::numeric(18,8) as line_pv,
  pi."createdAt" as created_at,
  pi."updatedAt" as updated_at
from "PackageItem" pi
join "ProductDetail" pd on pd."id" = pi."productDetailId"
join "Product" p on p."id" = pd."productId"
join "ProductCategory" c on c."id" = p."categoryId"
join "Supplier" s on s."id" = p."supplierId";

create view stephub_orders_v1 as
select
  o."id" as source_order_id,
  o."id"::bigint as id,
  o."orderNo" as order_no,
  o."userId" as source_user_id,
  u."memberCode" as member_code,
  u."name" as name,
  u."email" as email,
  u."phone" as phone_number,
  u."referralCode" as referral_code,
  o."status"::text as status,
  lower(o."status"::text) as order_status,
  o."approvalStatus"::text as approval_status,
  o."subtotalUsdt"::numeric(18,8) as subtotal,
  o."totalUsdt"::numeric(18,8) as total,
  o."totalPv"::numeric(18,8) as total_pv,
  count(oi."id")::integer as item_count,
  coalesce(sum(oi."qty"), 0)::integer as total_units,
  o."paidAt" as paid_at,
  o."approvedAt" as approved_at,
  o."shippedAt" as shipped_at,
  o."deliveredAt" as delivered_at,
  o."shipmentTrackingNo" as shipment_tracking_no,
  o."shipmentCarrier" as shipment_carrier,
  o."shipmentNote" as shipment_note,
  o."createdAt" as created_at,
  o."updatedAt" as updated_at
from "Order" o
join "User" u on u."id" = o."userId"
left join "OrderItem" oi on oi."orderId" = o."id"
group by
  o."id",
  o."orderNo",
  o."userId",
  u."memberCode",
  u."name",
  u."email",
  u."phone",
  u."referralCode",
  o."status",
  o."approvalStatus",
  o."subtotalUsdt",
  o."totalUsdt",
  o."totalPv",
  o."paidAt",
  o."approvedAt",
  o."shippedAt",
  o."deliveredAt",
  o."shipmentTrackingNo",
  o."shipmentCarrier",
  o."shipmentNote",
  o."createdAt",
  o."updatedAt";

create view stephub_order_items_v1 as
select
  oi."id" as source_order_item_id,
  oi."id"::bigint as id,
  oi."orderId" as source_order_id,
  oi."packageId" as source_package_id,
  p."code" as package_code,
  p."name" as name,
  oi."productId" as product_id,
  oi."qty" as quantity,
  oi."unitPriceUsdt"::numeric(18,8) as price,
  nullif(oi."unitPriceUsdt", 0)::numeric(18,8) as old_price,
  oi."unitPv"::numeric(18,8) as pv,
  oi."lineTotalUsdt"::numeric(18,8) as line_total,
  oi."lineTotalPv"::numeric(18,8) as line_total_pv,
  oi."createdAt" as created_at,
  oi."updatedAt" as updated_at
from "OrderItem" oi
left join "Package" p on p."id" = oi."packageId";

create view stephub_members_v1 as
select
  u."id" as source_user_id,
  u."id"::bigint as id,
  row_number() over (order by u."createdAt", u."id")::bigint as seq_no,
  u."memberCode" as member_code,
  coalesce(mp."joinedAtOverride", u."createdAt"::date) as joined_date,
  s."memberCode" as sponsor_code,
  uu."memberCode" as upline_code,
  mp."nationalId" as national_id,
  case
    when mp."placementSide" is null then null
    else initcap(lower(mp."placementSide"::text))
  end as side,
  u."name" as full_name,
  mp."rankCode" as rank_code,
  mp."honorTitle" as honor_title,
  mp."mobileCenterCode" as mobile_center,
  u."email" as email,
  u."phone" as phone,
  u."referralCode" as referral_code,
  u."status"::text as status,
  u."createdAt" as created_at,
  u."updatedAt" as updated_at
from public."User" u
left join public."User" s on s."id" = u."sponsorId"
left join public."MemberProfile" mp on mp."userId" = u."id"
left join public."User" uu on uu."id" = mp."uplineUserId";

commit;
