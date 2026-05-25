#!/usr/bin/env bash

set -euo pipefail

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-poolproject-postgres}"
DB_NAME="${DB_NAME:-poolproject}"
DB_USER="${DB_USER:-postgres}"
MEMBER_CODE="${MEMBER_CODE:-}"
DATE_FROM="${DATE_FROM:-}"
DATE_TO="${DATE_TO:-}"
LIMIT_ROWS="${LIMIT_ROWS:-10}"

query_pg() {
  docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atqc "$1"
}

sql_literal() {
  printf "%s" "$1" | sed "s/'/''/g; 1s/^/'/; \$s/\$/'/"
}

build_member_filter() {
  local alias="$1"

  if [[ -z "$MEMBER_CODE" ]]; then
    return 0
  fi

  printf ' and u."memberCode" = %s' "$(sql_literal "$MEMBER_CODE")"
}

build_date_filter() {
  local alias="$1"
  local sql=""

  if [[ -n "$DATE_FROM" ]]; then
    sql+=" and date(${alias}.\"createdAt\") >= $(sql_literal "$DATE_FROM")"
  fi

  if [[ -n "$DATE_TO" ]]; then
    sql+=" and date(${alias}.\"createdAt\") <= $(sql_literal "$DATE_TO")"
  fi

  printf "%s" "$sql"
}

main() {
  local ledger_member_filter matrix_member_filter pool_member_filter
  local ledger_date_filter matrix_date_filter pool_date_filter fallback_date_filter

  ledger_member_filter="$(build_member_filter "cl")"
  matrix_member_filter="$(build_member_filter "mp")"
  pool_member_filter="$(build_member_filter "dpp")"
  ledger_date_filter="$(build_date_filter "cl")"
  matrix_date_filter="$(build_date_filter "mp")"
  pool_date_filter="$(build_date_filter "dpp")"
  fallback_date_filter="$(build_date_filter "cbl")"

  echo "== COMMISSION MAIN PLAN DB SUMMARY =="
  echo "member_code=${MEMBER_CODE:-ALL}"
  echo "date_from=${DATE_FROM:-ANY}"
  echo "date_to=${DATE_TO:-ANY}"
  echo

  echo "-- Ledger summary"
  query_pg "
    select
      count(*) || '|' ||
      coalesce(sum(case when cl.\"status\" in ('APPROVED','HELD','WITHDRAWABLE','RESERVED_FOR_PAYOUT','PAID_OUT') then cl.\"commissionAmount\" else 0 end), 0) || '|' ||
      coalesce(sum(case when cl.\"status\" = 'FALLBACK' then cl.\"commissionAmount\" else 0 end), 0) || '|' ||
      coalesce(max(cl.\"createdAt\")::text, '-')
    from \"CommissionLedger\" cl
    left join \"User\" u on u.\"id\" = cl.\"beneficiaryUserId\"
    where cl.\"commissionType\" in ('DIRECT','UNI','CASHBACK')
    ${ledger_member_filter}
    ${ledger_date_filter}
  " | awk -F'|' '{printf "rows=%s\ncounted_amount=%s\nfallback_amount=%s\nlatest=%s\n", $1, $2, $3, $4}'

  echo
  echo "-- Matrix summary"
  query_pg "
    select
      count(*) || '|' ||
      coalesce(sum(case when mp.\"status\" in ('PENDING','APPROVED','PAID') then mp.\"payoutAmount\" else 0 end), 0) || '|' ||
      coalesce(max(mp.\"createdAt\")::text, '-')
    from \"MatrixPayout\" mp
    left join \"User\" u on u.\"id\" = mp.\"beneficiaryUserId\"
    where 1 = 1
    ${matrix_member_filter}
    ${matrix_date_filter}
  " | awk -F'|' '{printf "rows=%s\ncounted_amount=%s\nlatest=%s\n", $1, $2, $3}'

  echo
  echo "-- Pool summary"
  query_pg "
    select
      count(*) || '|' ||
      coalesce(sum(case when dpp.\"status\" in ('APPROVED','HELD','WITHDRAWABLE','RESERVED_FOR_PAYOUT','PAID_OUT') then dpp.\"payoutAmount\" else 0 end), 0) || '|' ||
      coalesce(max(dpp.\"createdAt\")::text, '-')
    from \"DailyPoolPayout\" dpp
    left join \"User\" u on u.\"id\" = dpp.\"userId\"
    where 1 = 1
    ${pool_member_filter}
    ${pool_date_filter}
  " | awk -F'|' '{printf "rows=%s\ncounted_amount=%s\nlatest=%s\n", $1, $2, $3}'

  echo
  echo "-- Company fallback summary"
  query_pg "
    select
      count(*) || '|' ||
      coalesce(sum(cbl.\"amount\"), 0)
    from \"CompanyBonusLedger\" cbl
    where 1 = 1
    ${fallback_date_filter}
  " | awk -F'|' '{printf "rows=%s\namount=%s\n", $1, $2}'

  echo
  echo "-- Recent ledger rows"
  query_pg "
    select
      coalesce(u.\"memberCode\", '-') || '|' ||
      cl.\"commissionType\" || '|' ||
      cl.\"status\" || '|' ||
      cl.\"commissionAmount\" || '|' ||
      cl.\"createdAt\"::text
    from \"CommissionLedger\" cl
    left join \"User\" u on u.\"id\" = cl.\"beneficiaryUserId\"
    where cl.\"commissionType\" in ('DIRECT','UNI','CASHBACK')
    ${ledger_member_filter}
    ${ledger_date_filter}
    order by cl.\"createdAt\" desc, cl.\"id\" desc
    limit ${LIMIT_ROWS}
  "

  echo
  echo "-- Recent matrix payouts"
  query_pg "
    select
      coalesce(u.\"memberCode\", '-') || '|' ||
      mp.\"boardNo\" || '|' ||
      mp.\"levelNo\" || '|' ||
      mp.\"status\" || '|' ||
      mp.\"payoutAmount\" || '|' ||
      mp.\"createdAt\"::text
    from \"MatrixPayout\" mp
    left join \"User\" u on u.\"id\" = mp.\"beneficiaryUserId\"
    where 1 = 1
    ${matrix_member_filter}
    ${matrix_date_filter}
    order by mp.\"createdAt\" desc, mp.\"id\" desc
    limit ${LIMIT_ROWS}
  "

  echo
  echo "-- Recent pool payouts"
  query_pg "
    select
      coalesce(u.\"memberCode\", '-') || '|' ||
      dpc.\"cycleDate\"::text || '|' ||
      dpp.\"status\" || '|' ||
      dpp.\"payoutAmount\" || '|' ||
      dpp.\"createdAt\"::text
    from \"DailyPoolPayout\" dpp
    join \"DailyPoolCycle\" dpc on dpc.\"id\" = dpp.\"cycleId\"
    left join \"User\" u on u.\"id\" = dpp.\"userId\"
    where 1 = 1
    ${pool_member_filter}
    ${pool_date_filter}
    order by dpp.\"createdAt\" desc, dpp.\"id\" desc
    limit ${LIMIT_ROWS}
  "
}

main "$@"
