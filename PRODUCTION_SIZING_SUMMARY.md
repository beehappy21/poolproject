# Production Sizing Summary

Updated: 2026-03-28

## Scope

This summary is for the current Poolproject + Stephub stack with:

- NestJS API
- NestJS worker
- BAO admin on Laravel/Orchid
- Stephub app frontend
- PostgreSQL database

Target usage:

- up to `1,000` members
- real order entry
- real wallet usage
- commission, matrix, pool, reentry, withdraw, and BAO admin usage

## Recommended Budget

Target budget:

- around `100 USD / month`

## Recommended Production Shape

Best balance within budget:

- `1` app server
  - `4 vCPU`
  - `8 GB RAM`
  - `100-160 GB SSD`
- `1` managed PostgreSQL instance
  - `1 vCPU`
  - `2 GB RAM`
  - `30-80 GB storage`
- `Cloudflare` in front for DNS/SSL/CDN/basic protection

This is the recommended starting point for real production usage.

## Deployment Layout

### App Server

Run these on the same server:

- `Nginx`
- `NestJS API`
- `NestJS worker`
- `Stephub app`
- `BAO Laravel/Orchid`

Recommended hostnames:

- `example.com` -> Stephub app
- `api.example.com` -> NestJS API
- `bao.example.com` -> BAO admin

### Database

Use managed PostgreSQL instead of self-hosting DB on the app server.

Reason:

- easier backup and restore
- lower operational risk
- less contention between DB and app processes
- better upgrade path

## Why This Size Is Enough

This stack should comfortably handle:

- total members up to `1,000`
- normal admin activity
- dozens of concurrent member sessions
- roughly `50-300` orders/day
- wallet and commission processing in the background

It is a practical starting point, not an infinite-capacity setup.

## Not Recommended For Real Production

Avoid this as the main production shape:

- `1` server with `2 vCPU / 4 GB RAM` running everything including DB

Reason:

- too easy for API, BAO exports, worker jobs, and DB to contend with each other
- less safe for backup/recovery
- less headroom for spikes

This shape is better for demo/UAT than real production.

## Suggested Providers

### Option A: DigitalOcean

Recommended if you want the easiest balanced setup.

Suggested purchase:

- Droplet `8 GB / 4 vCPU`
- Managed PostgreSQL `2 GB`

Approximate monthly cost checked on 2026-03-28:

- Droplet: about `$48/month`
- Managed PostgreSQL: about `$30.45/month`
- total before add-ons: about `$78.45/month`

Official pricing pages:

- https://www.digitalocean.com/pricing/droplets
- https://www.digitalocean.com/products/managed-databases-postgresql

### Option B: Hetzner

Recommended if lowest cost matters and your team can manage more ops yourselves.

Suggested purchase:

- `CX32` or `CX42` for app workloads
- separate DB strategy

Notes:

- very cost-effective
- less convenient than using a managed DB stack like DigitalOcean

Reference:

- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/

### Option C: AWS Lightsail

Usable, but tighter against the same budget.

Reference:

- https://aws.amazon.com/lightsail/pricing/

## Recommended Process Setup

Use these components in production:

- `Nginx` as reverse proxy
- `systemd` or `pm2` for API and worker
- `php-fpm` for BAO
- managed PostgreSQL for DB

Suggested internal shape:

- app frontend served by `Nginx`
- API on internal port such as `3000`
- worker as separate background process
- BAO served from Laravel public directory via `php-fpm`

## Storage Recommendations

At minimum:

- DB backups enabled daily
- product images and slips backed up
- runtime config backed up

Better long-term:

- move uploaded files to object storage
- keep DB backups managed by provider

## Security and Reliability Minimums

Before go-live, ensure:

- SSL enabled
- firewall enabled
- Cloudflare or equivalent edge protection
- monitoring for CPU/RAM/disk
- log rotation
- restart policy for API and worker
- separate production `.env`

## Operational Notes

- keep DB separate from app server if budget allows
- do not run destructive local reset/smoke scripts against production-like data
- maintain regular DB snapshots before major config changes
- keep BAO access restricted

## Simple Recommended Buy List

If buying today for this project:

1. `1` VM: `4 vCPU / 8 GB / 100-160 GB SSD`
2. `1` managed PostgreSQL: `2 GB / 1 vCPU`
3. `Cloudflare` free or paid entry plan
4. domain name
5. backup storage / object storage

## Future Upgrade Path

Upgrade to the next level when:

- members grow beyond `1,000`
- order volume spikes regularly
- BAO exports/reports become heavy
- worker jobs start delaying API response times

Next step after the starter setup:

- app/API/worker server: `8 vCPU / 16 GB`
- BAO split to a separate smaller server if needed
- managed PostgreSQL: `4 GB / 2 vCPU`

## Final Recommendation

For this project and this budget, the strongest default choice is:

- `DigitalOcean 4 vCPU / 8 GB app server`
- `DigitalOcean Managed PostgreSQL 2 GB`
- `Cloudflare`

This is the best balance of cost, simplicity, and enough headroom for a real start.
