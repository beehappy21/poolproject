#!/usr/bin/env bash
set -euo pipefail

# Allow cloudflared to choose the healthiest transport instead of pinning
# HTTP/2, which has recently produced repeated "http2: stream closed" errors
# for public WAP requests.
if [[ -n "${CLOUDFLARED_PROTOCOL:-}" ]]; then
  exec /usr/local/bin/cloudflared tunnel --protocol "${CLOUDFLARED_PROTOCOL}" run blifehealthy
fi

exec /usr/local/bin/cloudflared tunnel run blifehealthy
