# Cloudflare Tunnel Setup For blifehealthy.com

Updated: 2026-03-28

## Purpose

This document explains how the current Mac local stack is exposed through the real domain using Cloudflare Tunnel.

This setup is intended for:

- production-like testing
- UAT
- checking the real domain flow before moving to a permanent production server

This setup is not intended to be the final long-term production hosting model.

## Current Domain Mapping

The current tunnel routes are:

- `https://wap.blifehealthy.com` -> local Stephub app on `127.0.0.1:3002`
- `https://api.blifehealthy.com` -> local API on `127.0.0.1:3000`
- `https://bao.blifehealthy.com` -> local BAO on `127.0.0.1:8001`

## Tunnel Identity

Tunnel name:

- `blifehealthy`

Tunnel ID:

- `12bdd3d4-7102-43a0-b5f5-b70e9b0d0dbe`

Expected credentials file:

- `/Users/macbook/.cloudflared/12bdd3d4-7102-43a0-b5f5-b70e9b0d0dbe.json`

Expected config file:

- `/Users/macbook/.cloudflared/config.yml`

## Current config.yml

Expected config:

```yaml
tunnel: 12bdd3d4-7102-43a0-b5f5-b70e9b0d0dbe
credentials-file: /Users/macbook/.cloudflared/12bdd3d4-7102-43a0-b5f5-b70e9b0d0dbe.json

ingress:
  - hostname: wap.blifehealthy.com
    service: http://127.0.0.1:3002
  - hostname: api.blifehealthy.com
    service: http://127.0.0.1:3000
  - hostname: bao.blifehealthy.com
    service: http://127.0.0.1:8001
  - service: http_status:404
```

## DNS Routes

These public hostnames must route to the tunnel:

- `wap.blifehealthy.com`
- `api.blifehealthy.com`
- `bao.blifehealthy.com`

They should be created through:

```bash
cloudflared tunnel route dns blifehealthy wap.blifehealthy.com
cloudflared tunnel route dns blifehealthy api.blifehealthy.com
cloudflared tunnel route dns blifehealthy bao.blifehealthy.com
```

## Local Startup Flow

From `/Users/macbook/poolproject`:

```bash
bash scripts/dev-restart.sh
npm run dev:check
cloudflared tunnel run blifehealthy
```

Important:

- the terminal running `cloudflared tunnel run blifehealthy` must stay open
- if the tunnel process stops, the public domain routes stop working immediately

## Automatic Startup On This Mac

This Mac is now configured with a custom launch agent so the tunnel can start automatically at login.

Launcher script:

- [run_blifehealthy_tunnel.sh](/Users/macbook/poolproject/scripts/run_blifehealthy_tunnel.sh)

LaunchAgent created on this Mac:

- `~/Library/LaunchAgents/com.cloudflare.blifehealthy-tunnel.plist`

What it runs:

```bash
/Users/macbook/poolproject/scripts/run_blifehealthy_tunnel.sh
```

That script runs:

```bash
cloudflared tunnel run blifehealthy
```

Useful commands:

- stop the auto-started tunnel for the current session:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.cloudflare.blifehealthy-tunnel.plist
```

- start it again for the current session:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloudflare.blifehealthy-tunnel.plist
launchctl kickstart -k gui/$(id -u)/com.cloudflare.blifehealthy-tunnel
```

- check current macOS agent status:

```bash
launchctl print gui/$(id -u)/com.cloudflare.blifehealthy-tunnel
```

- view logs:

```bash
tail -f ~/Library/Logs/com.cloudflare.blifehealthy-tunnel.out.log
tail -f ~/Library/Logs/com.cloudflare.blifehealthy-tunnel.err.log
```

## Verified Working URLs

As of 2026-03-28:

- `https://api.blifehealthy.com/health`
- `https://bao.blifehealthy.com/admin/login`
- `https://wap.blifehealthy.com`

## App/API Runtime Notes

The app now detects the real public hostname and switches automatically:

- app opened on `wap.blifehealthy.com`
- API base becomes `https://api.blifehealthy.com`
- BAO base becomes `https://bao.blifehealthy.com`

The API CORS allowlist also includes:

- `https://wap.blifehealthy.com`
- `https://api.blifehealthy.com`
- `https://bao.blifehealthy.com`

## BAO Local Admin Accounts

Known BAO admin emails in the current local sqlite DB:

- `admin@stephub.local`
- `superadmin@blifehealthy.com`

Local password was reset during this setup so both accounts can use:

- `472121`

## Why `www.blifehealthy.com` Was Not Used

Do not point the main `www.blifehealthy.com` site directly to this Mac.

Reason:

- the main website is already live elsewhere
- the Mac tunnel setup is intended only for testing/staging-like access
- using subdomains avoids interfering with the main public site

## Known Limitations

- this depends on the Mac staying awake and online
- this depends on the tunnel process remaining open
- this is not a substitute for real production hosting
- local file paths, local DB state, and local runtime state still live on this machine

## Recommended Next Step

Use this setup for:

- UAT
- real-domain flow review
- admin/user testing before moving to a dedicated production server

When ready for real production:

- move API/worker/app/BAO to a dedicated server
- move DB to managed PostgreSQL
- keep the real production domain pointed at the permanent server instead of the Mac
