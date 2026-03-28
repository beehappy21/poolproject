# Real Domain Test Checklist

Updated: 2026-03-28

Use this checklist when testing through:

- `https://wap.blifehealthy.com`
- `https://api.blifehealthy.com`
- `https://bao.blifehealthy.com`

## Before Testing

- [ ] Mac is awake and connected to the internet
- [ ] local stack has been restarted
- [ ] `npm run dev:check` passes
- [ ] `cloudflared tunnel run blifehealthy` is running

## Infrastructure Check

- [ ] `https://api.blifehealthy.com/health` returns `{"status":"ok"}`
- [ ] `https://bao.blifehealthy.com/admin/login` opens
- [ ] `https://wap.blifehealthy.com` opens

## BAO Login Check

- [ ] BAO login works with `superadmin@blifehealthy.com`
- [ ] BAO login works with password `472121`
- [ ] If needed, fallback admin `admin@stephub.local` also works with `472121`

## App Login Check

- [ ] app login page opens on `wap.blifehealthy.com`
- [ ] member login works with a valid member code
- [ ] local test login `TH0000001 / a1a1a1` works if the current DB snapshot supports it
- [ ] app no longer depends on `127.0.0.1` when opened from the public domain

## App Core Flow

- [ ] Home loads
- [ ] product list loads
- [ ] product detail loads
- [ ] cart works
- [ ] checkout works
- [ ] order history works
- [ ] commission pages load

## BAO Core Flow

- [ ] dashboard opens after login
- [ ] catalog pages load
- [ ] orders pages load
- [ ] members pages load
- [ ] wallet pages load
- [ ] commission settings pages load

## Cross-Domain Integration Check

- [ ] app requests are going to `api.blifehealthy.com`
- [ ] app BAO-fed content is loading from `bao.blifehealthy.com`
- [ ] no browser mixed-content warnings appear
- [ ] no CORS errors appear in browser console

## Real-Like Transaction Check

- [ ] create a member sale in BAO
- [ ] verify order appears correctly
- [ ] verify wallet movement if applicable
- [ ] verify commission movement if applicable
- [ ] verify stock movement if applicable

## Troubleshooting

If the public domain stops working:

- [ ] confirm the tunnel terminal is still running
- [ ] confirm `npm run dev:check` still passes
- [ ] confirm Cloudflare DNS routes still point to the tunnel

If app login fails:

- [ ] hard refresh the page
- [ ] verify API health URL still works
- [ ] verify the member credentials against the current local DB snapshot

If BAO login fails:

- [ ] confirm email is exactly `superadmin@blifehealthy.com`
- [ ] retry password `472121`
- [ ] try `admin@stephub.local / 472121`

## Notes

- this setup is for testing through the real domain, not final production hosting
- the state depends on the current local DB and runtime snapshot on this Mac
- keep a fresh backup before important test sessions
