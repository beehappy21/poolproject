#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8001}"
COOKIE_JAR="/tmp/stephub.cookies"

LOGIN_PAGE="$(curl -s -c "$COOKIE_JAR" "$BASE_URL/admin/login")"
TOKEN="$(printf '%s' "$LOGIN_PAGE" | perl -ne 'if(/name="_token" value="([^"]+)"/){print $1; exit}')"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/admin/login" \
  --data-urlencode "_token=$TOKEN" \
  --data-urlencode "email=admin@stephub.local" \
  --data-urlencode "password=Admin123" \
  --data-urlencode "remember=true" \
  -o /tmp/stephub-login-post.html \
  -D /tmp/stephub-login-post.headers >/dev/null

CATEGORY_STATUS="$(curl -s -b "$COOKIE_JAR" -o /tmp/stephub-category-auth.html -w '%{http_code}' "$BASE_URL/admin/category/list")"
PRODUCT_STATUS="$(curl -s -b "$COOKIE_JAR" -o /tmp/stephub-product-auth.html -w '%{http_code}' "$BASE_URL/admin/product/list")"
SUPPLIER_STATUS="$(curl -s -b "$COOKIE_JAR" -o /tmp/stephub-supplier-auth.html -w '%{http_code}' "$BASE_URL/admin/supplier/list")"
PACKAGE_STATUS="$(curl -s -b "$COOKIE_JAR" -o /tmp/stephub-package-auth.html -w '%{http_code}' "$BASE_URL/admin/package/list")"
ORDER_STATUS="$(curl -s -b "$COOKIE_JAR" -o /tmp/stephub-order-auth.html -w '%{http_code}' "$BASE_URL/admin/order/list")"

echo "category=$CATEGORY_STATUS"
echo "product=$PRODUCT_STATUS"
echo "supplier=$SUPPLIER_STATUS"
echo "package=$PACKAGE_STATUS"
echo "order=$ORDER_STATUS"
