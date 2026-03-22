# Migration Scripts

Helper scripts and SQL used for local schema orchestration outside Prisma-managed tables.

## Stephub Compatibility Views

The file [`create_stephub_compat_views.sql`](/Users/macbook/poolproject/scripts/migrations/create_stephub_compat_views.sql) creates read-only PostgreSQL views that reshape poolproject catalog data into a Stephub-friendly shape.

Current views:

- `stephub_categories_v1`
- `stephub_products_v1`
- `stephub_suppliers_v1`
- `stephub_members_v1`

These are intended for:

- Stephub Laravel bridge models
- catalog list screens
- storefront compatibility experiments
- member list compatibility screens

Example apply command from a machine with PostgreSQL client access:

```bash
docker exec -i <postgres-container> psql \
  postgresql://postgres:postgres@127.0.0.1:5432/poolproject \
  < scripts/migrations/create_stephub_compat_views.sql
```

## Presentation Fields

The file [`add_stephub_presentation_fields.sql`](/Users/macbook/poolproject/scripts/migrations/add_stephub_presentation_fields.sql) adds catalog metadata fields needed for a Stephub-first admin/storefront model, such as:

- `slug`
- `description`
- `imageUrl`
- `sortOrder`
- `isFeatured`
- product detail merchandising flags and rating fields

## Member Profile

The file [`add_member_profile.sql`](/Users/macbook/poolproject/scripts/migrations/add_member_profile.sql) adds a `MemberProfile` extension table for member-reporting fields that do not belong directly on `User`, such as:

- `nationalId`
- `uplineUserId`
- `placementSide`
- `rankCode`
- `honorTitle`
- `mobileCenterCode`
- `joinedAtOverride`
