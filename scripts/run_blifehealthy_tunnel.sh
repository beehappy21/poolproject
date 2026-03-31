#!/usr/bin/env bash
set -euo pipefail

# Force HTTP/2 transport because this Mac intermittently loses QUIC/UDP
# connectivity, which causes public clients to see flaky 1033/ERR_NETWORK.
exec /usr/local/bin/cloudflared tunnel --protocol http2 run blifehealthy
