-- Allow spreadsheet-style member imports to keep duplicate phone and national ID values.

begin;

alter table "User" drop constraint if exists "User_phone_key";
drop index if exists "User_phone_key";

alter table "MemberProfile" drop constraint if exists "MemberProfile_nationalId_key";
drop index if exists "MemberProfile_nationalId_key";

create index if not exists "User_phone_idx" on "User" ("phone");
create index if not exists "MemberProfile_nationalId_idx" on "MemberProfile" ("nationalId");

commit;
