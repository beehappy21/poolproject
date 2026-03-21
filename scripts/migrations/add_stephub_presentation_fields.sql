-- Adds presentation-oriented catalog fields needed for Stephub-first UX.
-- Apply against the poolproject PostgreSQL database after reviewing in staging.

begin;

alter table "Supplier"
  add column if not exists "slug" varchar(255),
  add column if not exists "description" text,
  add column if not exists "imageUrl" varchar(500),
  add column if not exists "sortOrder" integer not null default 0,
  add column if not exists "isFeatured" boolean not null default false;

alter table "ProductCategory"
  add column if not exists "slug" varchar(255),
  add column if not exists "description" text,
  add column if not exists "imageUrl" varchar(500),
  add column if not exists "audienceTags" text[] not null default '{}',
  add column if not exists "sortOrder" integer not null default 0,
  add column if not exists "isFeatured" boolean not null default false;

alter table "Product"
  add column if not exists "slug" varchar(255),
  add column if not exists "description" text,
  add column if not exists "sortOrder" integer not null default 0,
  add column if not exists "isFeatured" boolean not null default false;

alter table "ProductDetail"
  add column if not exists "slug" varchar(255),
  add column if not exists "shortDescription" varchar(500),
  add column if not exists "description" text,
  add column if not exists "primaryImageUrl" varchar(500),
  add column if not exists "ratingAvg" numeric(10,2) not null default 0,
  add column if not exists "ratingCount" integer not null default 0,
  add column if not exists "sortOrder" integer not null default 0,
  add column if not exists "isNew" boolean not null default false,
  add column if not exists "isTop" boolean not null default false,
  add column if not exists "isFeatured" boolean not null default false,
  add column if not exists "isBestSeller" boolean not null default false;

create unique index if not exists "Supplier_slug_key" on "Supplier" ("slug");
create unique index if not exists "ProductCategory_slug_key" on "ProductCategory" ("slug");
create unique index if not exists "Product_slug_key" on "Product" ("slug");
create unique index if not exists "ProductDetail_slug_key" on "ProductDetail" ("slug");

commit;
