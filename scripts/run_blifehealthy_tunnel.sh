#!/usr/bin/env bash
set -euo pipefail

exec /usr/local/bin/cloudflared tunnel run blifehealthy
