# Stephub Schema Compatibility Plan

## Goal

Use Stephub as the primary admin and storefront UX while preserving the poolproject business domain:

- MLM/member lifecycle
- package-driven ordering
- commissions, matrix, pool
- supplier/category/product/product-detail separation

The target architecture is **Stephub-first UI + poolproject domain DB + compatibility/read-model layer**.

## Decision

We will **not** reshape the poolproject schema to match Stephub's original Laravel tables one-for-one.

We **will**:

1. Keep the core poolproject schema as the source of truth.
2. Add presentation-oriented fields where Stephub needs richer merchandising data.
3. Expose Stephub-shaped read models through SQL views or adapter queries.
4. Gradually move Stephub admin pages from read-only to write-capable against poolproject rules.

## Current Shape

### Poolproject source models

- `Supplier`
- `ProductCategory`
- `Product`
- `ProductDetail`
- `Package`
- `PackageItem`
- `Order`
- `OrderItem`

### Stephub catalog expectations

Stephub's original Laravel admin/store expects a flatter e-commerce shape:

- `categories`
  - `name`
  - `image`
  - `audience`
- `products`
  - `name`
  - `image`
  - `images`
  - `categories`
  - `audience`
  - `description`
  - `price`
  - `old_price`
  - `rating`
  - `rating_count`
  - `quantity`
  - `promotion`
  - `is_new`
  - `is_top`
  - `is_featured`
  - `is_best_seller`
  - `is_available`
  - `colors`
  - `sizes`
  - `tags`

## Canonical Mapping

### Categories

Stephub `category`

- `id` <- `ProductCategory.id`
- `name` <- `ProductCategory.name`
- `image` <- generated or explicit category image field
- `audience` <- derived or future merchandising field

Poolproject impact:

- `ProductCategory` should eventually gain:
  - `slug`
  - `description`
  - `imageUrl`
  - `audienceTags String[]`
  - `sortOrder`
  - `isFeatured`

### Products

Stephub `product`

- Best mapped to **sellable SKU / PDP unit**, which in poolproject is `ProductDetail`

Recommended mapping:

- Stephub `product.id` <- `ProductDetail.id`
- Stephub `product.name` <- `ProductDetail.name`
- Stephub `product.image` <- first `ProductDetail.imageUrls[]`
- Stephub `product.images` <- `ProductDetail.imageUrls[]`
- Stephub `product.price` <- `ProductDetail.memberPriceUsdt`
- Stephub `product.old_price` <- `ProductDetail.retailPriceUsdt`
- Stephub `product.categories` <- `[ProductCategory.name]`
- Stephub `product.description` <- future `ProductDetail.description`, fallback `Product.name`
- Stephub `product.quantity` <- future inventory projection
- Stephub `product.colors` <- future variant merchandising table
- Stephub `product.sizes` <- future variant merchandising table
- Stephub `product.tags` <- future product tags
- Stephub booleans (`is_new`, `is_top`, `is_featured`, `is_best_seller`) <- future merchandising fields

Poolproject impact:

`ProductDetail` should eventually gain:

- `slug`
- `shortDescription`
- `description`
- `primaryImageUrl`
- `isFeatured`
- `isNew`
- `isTop`
- `isBestSeller`
- `ratingAvg`
- `ratingCount`
- `sortOrder`

### Product vs ProductDetail

Poolproject already has the more flexible shape:

- `Product` = parent merchandising family
- `ProductDetail` = sellable unit / variant / storefront SKU

Stephub pages should therefore be adapted as:

- category list -> `ProductCategory`
- product list -> `ProductDetail`
- product edit/detail page -> combined projection:
  - parent `Product`
  - child `ProductDetail`
  - category
  - supplier

### Packages

Stephub has no direct package-first concept.

Poolproject should keep:

- `Package`
- `PackageItem`

Compatibility strategy:

- storefront can display both:
  - normal Stephub-shaped products
  - poolproject package cards
- admin should get a separate package workspace instead of forcing package data into Stephub's original `products` table mental model

### Orders

Stephub original order shape is standard e-commerce.

Poolproject orders are package-oriented today.

Recommended target:

- keep current `Order` and `OrderItem`
- expand write path so `OrderItem` can represent:
  - package purchase
  - direct `ProductDetail` purchase

Needed evolution:

- `OrderItem.productDetailId BigInt?`
- preserve `packageId BigInt?`
- enforce business rules so one line references either package or product detail

## Compatibility Layer

### Phase 1: Read Models

Create SQL views that reshape poolproject data into Stephub-friendly fields:

- `stephub_categories_v1`
- `stephub_products_v1`

Use these for:

- admin list pages
- storefront listing pages
- search/filter experiments

### Phase 2: Adapter Services

Implement adapter services in either:

- Stephub Laravel backend
- poolproject Nest API

Responsibilities:

- filtering
- pagination
- merchandising defaults
- image fallbacks
- JSON/array normalization

### Phase 3: Write Models

Replace read-only screens with write-capable forms backed by poolproject semantics:

- category create/update
- product family create/update
- product detail create/update
- package create/update

## Recommended DB Additions

### Low-risk additions

Add to `ProductCategory`:

- `slug String?`
- `description String?`
- `imageUrl String?`
- `audienceTags String[] @default([])`
- `sortOrder Int @default(0)`
- `isFeatured Boolean @default(false)`

Add to `Product`:

- `slug String?`
- `description String?`
- `sortOrder Int @default(0)`
- `isFeatured Boolean @default(false)`

Add to `ProductDetail`:

- `slug String?`
- `shortDescription String?`
- `description String?`
- `primaryImageUrl String?`
- `ratingAvg Decimal @default(0)`
- `ratingCount Int @default(0)`
- `sortOrder Int @default(0)`
- `isNew Boolean @default(false)`
- `isTop Boolean @default(false)`
- `isFeatured Boolean @default(false)`
- `isBestSeller Boolean @default(false)`

### New supporting tables

Prefer explicit tables over packing everything into arrays:

- `ProductTag`
- `ProductTagMap`
- `ProductColorOption`
- `ProductSizeOption`
- `ProductDetailMedia`
- `InventoryBalance` or stock projection view

## Delivery Sequence

### Stage 1

- Done: Stephub admin reads poolproject `Category` and `Product` pages.
- Next: replace direct table bridge with SQL views.

### Stage 2

- Add `Supplier` page bridge.
- Add richer product detail projection page.
- Add package list page in Stephub admin.

### Stage 3

- Add presentation fields to Prisma schema.
- Backfill image/description/slug data.
- Move storefront product pages to compatibility views.

### Stage 4

- Expand order model for direct `ProductDetail` checkout.
- Connect Stephub cart/checkout to poolproject order engine.

## Guardrails

- Do not delete or flatten `ProductDetail`.
- Do not remove `Package` / `PackageItem`.
- Do not rewrite commission logic to fit generic e-commerce.
- Treat Stephub's original tables as a UX reference, not a canonical domain model.

## Immediate Next Tasks

1. Create SQL compatibility views for categories and products.
2. Point Stephub bridge models to those views instead of raw tables.
3. Add Prisma fields for category/product/detail presentation metadata.
4. Build a supplier compatibility page.
