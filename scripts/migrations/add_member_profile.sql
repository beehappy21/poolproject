-- Adds member profile extension table for spreadsheet-style member reporting.
-- Apply against the poolproject PostgreSQL database after reviewing in staging.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'PlacementSide') then
    create type "PlacementSide" as enum ('LEFT', 'RIGHT');
  end if;
end $$;

create table if not exists "MemberProfile" (
  "id" bigserial primary key,
  "userId" bigint not null,
  "nationalId" varchar(30),
  "uplineUserId" bigint,
  "placementSide" "PlacementSide",
  "rankCode" varchar(50),
  "honorTitle" varchar(100),
  "mobileCenterCode" varchar(100),
  "joinedAtOverride" date,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "MemberProfile_userId_fkey"
    foreign key ("userId") references "User" ("id") on delete cascade on update cascade,
  constraint "MemberProfile_uplineUserId_fkey"
    foreign key ("uplineUserId") references "User" ("id") on delete set null on update cascade
);

create unique index if not exists "MemberProfile_userId_key" on "MemberProfile" ("userId");
create unique index if not exists "MemberProfile_nationalId_key"
  on "MemberProfile" ("nationalId")
  where "nationalId" is not null;
create index if not exists "MemberProfile_uplineUserId_idx" on "MemberProfile" ("uplineUserId");
create index if not exists "MemberProfile_placementSide_idx" on "MemberProfile" ("placementSide");
create index if not exists "MemberProfile_rankCode_idx" on "MemberProfile" ("rankCode");

create or replace function set_member_profile_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_member_profile_updated_at on "MemberProfile";
create trigger trg_member_profile_updated_at
before update on "MemberProfile"
for each row
execute function set_member_profile_updated_at();

commit;
