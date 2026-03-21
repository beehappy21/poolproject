#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8001}"
COOKIE_JAR="/tmp/stephub-write.cookies"
SUFFIX="$(date +%s)"
SUPPLIER_CODE="ZZ-STH-SUP-${SUFFIX}"
SUPPLIER_NAME="Stephub Smoke Supplier ${SUFFIX}"
SUPPLIER_UPDATED_NAME="Stephub Smoke Supplier Updated ${SUFFIX}"
CATEGORY_CODE="ZZ-STH-CAT-${SUFFIX}"
CATEGORY_NAME="Stephub Smoke Category ${SUFFIX}"
PACKAGE_ID="${PACKAGE_ID:-143}"
PACKAGE_QTY="${PACKAGE_QTY:-2}"

extract_token() {
  perl -ne 'if(/name="_token" value="([^"]+)"/){print $1; exit}' "$1"
}

extract_state() {
  perl -ne 'if(/name="_state" id="screen-state" value="([^"]+)"/){print $1; exit}' "$1"
}

extract_match() {
  local pattern="$1"
  local file="$2"
  perl -0ne "if(/${pattern}/s){print \$1; exit}" "$file"
}

query_pg() {
  docker exec -i poolproject-postgres psql -U postgres -d poolproject -Atqc "$1"
}

login() {
  local login_page token
  login_page="/tmp/stephub-write-login.html"
  curl -s -c "$COOKIE_JAR" "$BASE_URL/admin/login" -o "$login_page"
  token="$(extract_token "$login_page")"

  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/login" \
    --data-urlencode "_token=$token" \
    --data-urlencode "email=admin@stephub.local" \
    --data-urlencode "password=Admin123" \
    --data-urlencode "remember=true" \
    -o /tmp/stephub-write-login-post.html >/dev/null
}

assert_contains() {
  local needle="$1"
  local file="$2"
  if ! rg -q --fixed-strings "$needle" "$file"; then
    echo "Expected to find '$needle' in $file" >&2
    exit 1
  fi
}

assert_not_contains() {
  local needle="$1"
  local file="$2"
  if rg -q --fixed-strings "$needle" "$file"; then
    echo "Did not expect to find '$needle' in $file" >&2
    exit 1
  fi
}

login

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/supplier/edit" -o /tmp/stephub-supplier-create-smoke.html
SUPPLIER_TOKEN="$(extract_token /tmp/stephub-supplier-create-smoke.html)"
SUPPLIER_STATE="$(extract_state /tmp/stephub-supplier-create-smoke.html)"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/supplier/edit/create" \
  --data-urlencode "_token=$SUPPLIER_TOKEN" \
  --data-urlencode "_state=$SUPPLIER_STATE" \
  --data-urlencode "supplier[name]=$SUPPLIER_NAME" \
  --data-urlencode "supplier[code]=$SUPPLIER_CODE" \
  --data-urlencode "supplier[slug]=" \
  --data-urlencode "supplier[imageUrl]=" \
  --data-urlencode "supplier[description]=Stephub smoke supplier" \
  --data-urlencode "supplier[sortOrder]=0" \
  --data-urlencode "supplier[isFeatured]=0" \
  --data-urlencode "supplier[status]=ACTIVE" \
  -o /tmp/stephub-supplier-create-post.html >/dev/null

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/supplier/list" -o /tmp/stephub-supplier-list-smoke.html
assert_contains "$SUPPLIER_CODE" /tmp/stephub-supplier-list-smoke.html

SUPPLIER_ID="$(query_pg "select id from \"Supplier\" where code = '${SUPPLIER_CODE}' order by id desc limit 1")"
if [[ -z "$SUPPLIER_ID" ]]; then
  echo "Could not locate created supplier id" >&2
  exit 1
fi

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/supplier/edit/$SUPPLIER_ID" -o /tmp/stephub-supplier-edit-smoke.html
SUPPLIER_EDIT_TOKEN="$(extract_token /tmp/stephub-supplier-edit-smoke.html)"
SUPPLIER_EDIT_STATE="$(extract_state /tmp/stephub-supplier-edit-smoke.html)"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/supplier/edit/$SUPPLIER_ID/update" \
  --data-urlencode "_token=$SUPPLIER_EDIT_TOKEN" \
  --data-urlencode "_state=$SUPPLIER_EDIT_STATE" \
  --data-urlencode "supplier[name]=$SUPPLIER_UPDATED_NAME" \
  --data-urlencode "supplier[code]=$SUPPLIER_CODE" \
  --data-urlencode "supplier[slug]=" \
  --data-urlencode "supplier[imageUrl]=" \
  --data-urlencode "supplier[description]=Stephub smoke supplier updated" \
  --data-urlencode "supplier[sortOrder]=1" \
  --data-urlencode "supplier[isFeatured]=1" \
  --data-urlencode "supplier[status]=ACTIVE" \
  -o /tmp/stephub-supplier-update-post.html >/dev/null

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/supplier/list" -o /tmp/stephub-supplier-list-after-update.html
assert_contains "$SUPPLIER_UPDATED_NAME" /tmp/stephub-supplier-list-after-update.html

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/category/edit" -o /tmp/stephub-category-create-smoke.html
CATEGORY_TOKEN="$(extract_token /tmp/stephub-category-create-smoke.html)"
CATEGORY_STATE="$(extract_state /tmp/stephub-category-create-smoke.html)"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/category/edit/create" \
  --data-urlencode "_token=$CATEGORY_TOKEN" \
  --data-urlencode "_state=$CATEGORY_STATE" \
  --data-urlencode "category[supplierId]=$SUPPLIER_ID" \
  --data-urlencode "category[name]=$CATEGORY_NAME" \
  --data-urlencode "category[code]=$CATEGORY_CODE" \
  --data-urlencode "category[slug]=" \
  --data-urlencode "category[imageUrl]=" \
  --data-urlencode "category[description]=Stephub smoke category" \
  --data-urlencode "category[sortOrder]=0" \
  --data-urlencode "category[isFeatured]=0" \
  --data-urlencode "category[status]=ACTIVE" \
  -o /tmp/stephub-category-create-post.html >/dev/null

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/category/list" -o /tmp/stephub-category-list-smoke.html
assert_contains "$CATEGORY_CODE" /tmp/stephub-category-list-smoke.html

CATEGORY_ID="$(query_pg "select id from \"ProductCategory\" where code = '${CATEGORY_CODE}' order by id desc limit 1")"
if [[ -z "$CATEGORY_ID" ]]; then
  echo "Could not locate created category id" >&2
  exit 1
fi

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/category/edit/$CATEGORY_ID" -o /tmp/stephub-category-edit-smoke.html
CATEGORY_EDIT_TOKEN="$(extract_token /tmp/stephub-category-edit-smoke.html)"
CATEGORY_EDIT_STATE="$(extract_state /tmp/stephub-category-edit-smoke.html)"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/category/edit/$CATEGORY_ID/remove" \
  --data-urlencode "_token=$CATEGORY_EDIT_TOKEN" \
  --data-urlencode "_state=$CATEGORY_EDIT_STATE" \
  -o /tmp/stephub-category-remove-post.html >/dev/null

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/category/list" -o /tmp/stephub-category-list-after-remove.html
assert_not_contains "$CATEGORY_CODE" /tmp/stephub-category-list-after-remove.html

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/package/edit/$PACKAGE_ID" -o /tmp/stephub-package-edit-smoke.html
PACKAGE_TOKEN="$(extract_token /tmp/stephub-package-edit-smoke.html)"
PACKAGE_STATE="$(extract_state /tmp/stephub-package-edit-smoke.html)"
PRODUCT_DETAIL_ID="$(perl -ne 'if(/<option value="(\d+)"/){print $1; exit}' /tmp/stephub-package-edit-smoke.html)"

if [[ -z "$PRODUCT_DETAIL_ID" ]]; then
  echo "Could not locate a product detail option for package test" >&2
  exit 1
fi

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/package/edit/$PACKAGE_ID/addItem" \
  --data-urlencode "_token=$PACKAGE_TOKEN" \
  --data-urlencode "_state=$PACKAGE_STATE" \
  --data-urlencode "package[id]=$PACKAGE_ID" \
  --data-urlencode "item[productDetailId]=$PRODUCT_DETAIL_ID" \
  --data-urlencode "item[qty]=$PACKAGE_QTY" \
  -o /tmp/stephub-package-add-item-post.html >/dev/null

PACKAGE_ITEM_ID="$(query_pg "select id from \"PackageItem\" where \"packageId\" = ${PACKAGE_ID} and \"productDetailId\" = ${PRODUCT_DETAIL_ID} limit 1")"
if [[ -z "$PACKAGE_ITEM_ID" ]]; then
  echo "Could not locate created package item id" >&2
  exit 1
fi

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/package/edit/$PACKAGE_ID" -o /tmp/stephub-package-edit-after-add.html
PACKAGE_REMOVE_TOKEN="$(extract_token /tmp/stephub-package-edit-after-add.html)"
PACKAGE_REMOVE_STATE="$(extract_state /tmp/stephub-package-edit-after-add.html)"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/package/edit/$PACKAGE_ID/removeItem" \
  --data-urlencode "_token=$PACKAGE_REMOVE_TOKEN" \
  --data-urlencode "_state=$PACKAGE_REMOVE_STATE" \
  --data-urlencode "itemId=$PACKAGE_ITEM_ID" \
  --data-urlencode "packageId=$PACKAGE_ID" \
  -o /tmp/stephub-package-remove-item-post.html >/dev/null

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/package/edit/$PACKAGE_ID" -o /tmp/stephub-package-edit-after-remove.html
if [[ "$(query_pg "select count(*) from \"PackageItem\" where id = ${PACKAGE_ITEM_ID}")" != "0" ]]; then
  echo "Package item was not removed" >&2
  exit 1
fi

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/supplier/edit/$SUPPLIER_ID" -o /tmp/stephub-supplier-remove-smoke.html
SUPPLIER_REMOVE_TOKEN="$(extract_token /tmp/stephub-supplier-remove-smoke.html)"
SUPPLIER_REMOVE_STATE="$(extract_state /tmp/stephub-supplier-remove-smoke.html)"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/supplier/edit/$SUPPLIER_ID/remove" \
  --data-urlencode "_token=$SUPPLIER_REMOVE_TOKEN" \
  --data-urlencode "_state=$SUPPLIER_REMOVE_STATE" \
  -o /tmp/stephub-supplier-remove-post.html >/dev/null

curl -s -b "$COOKIE_JAR" "$BASE_URL/admin/supplier/list" -o /tmp/stephub-supplier-list-after-remove.html
assert_not_contains "$SUPPLIER_CODE" /tmp/stephub-supplier-list-after-remove.html

echo "supplier_create_update_remove=ok"
echo "category_create_remove=ok"
echo "package_item_add_remove=ok"
