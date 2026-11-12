# Deployment

Production runs on Hostinger shared hosting (LiteSpeed, PHP 8.4, MySQL), deployed by GitHub Actions.

## Pipeline (`.github/workflows/deploy.yml`)

Runs on every push and pull request to `main`. Only a push to `main` deploys.

1. **Frontend:** `npm ci`, dependency audit (fails on high severity), lint, tests, `npm run build`.
2. **Backend:** `composer validate --strict`, install, `composer audit`, `php artisan test`, route-list check.
3. **Deploy** (push to `main` only):
   - `composer install --no-dev --optimize-autoloader`.
   - The frontend build is copied into `backend-laravel/public/` and everything is packed into
     `deploy.tar.gz`. `.env`, `storage/` and `tests/` are left out.
   - `.github/scripts/deploy-hostinger.sh` connects over SSH. The host key is pinned by its ED25519
     fingerprint.

## What the deploy script does on the server

1. Backs up the database (`backup-erp.php`) and the current code.
2. Puts the site in maintenance mode, then unpacks the release over the app folder.
3. Runs `platform:verify-trust`, then `migrate --force`.
4. Rebuilds the config, route and view caches, then brings the site back up.
5. Calls `/up`. If that check fails, the site goes back into maintenance mode.

The release is unpacked over the existing folder, so files that a release moved or deleted stay on the
server as harmless leftovers. The optimised autoloader only points at the new locations.

## Required GitHub secrets

`HOSTINGER_SSH_HOST`, `HOSTINGER_SSH_USER`, `HOSTINGER_SSH_PORT`, `HOSTINGER_SSH_KEY`,
`HOSTINGER_SSH_FINGERPRINT` (SHA256:...), `HOSTINGER_APP_DIR` (absolute path containing `artisan`).

## Server setup

- **`.env`.** Lives only on the server; it is never committed or deployed. Production uses
  `APP_ENV=production` and `APP_DEBUG=false`, plus the MySQL credentials, Pusher keys, platform URL
  and keys, and `BUSINESS_TIMEZONE` if not Asia/Kolkata.
- **Cron.** One hPanel cron job (Advanced > Cron Jobs > Custom, every field "Every ... (*)"), added
  2026-11-01. The app lives in `~/domains/dev.gpsoftware.in/public_html`:

  ```
  /opt/alt/php84/usr/bin/php /home/<account>/domains/dev.gpsoftware.in/public_html/artisan schedule:run
  ```

  hPanel silently refuses commands containing `&&`, `;`, quotes or `>`. Keep it to a single command, or point
  it at a script, as the admin does. It runs every scheduled command listed in `docs/architecture.md`:
  platform sync, notification sync, nightly purchase-order drafts, accounting posting, HRMS day closing and
  the Backup Center's scheduled backups (`backups:run-scheduled`, checked every 15 minutes). Laravel's
  `withoutOverlapping` on each task stops runs piling up. The ERP queues nothing (realtime events are sent at
  the end of each request), so no queue worker is needed. The admin has its own cron
  (`Gpretail_Admin/deploy/hostinger/run.sh`).
- **On-premises (Windows) server.** The same scheduler has to run there: one Task Scheduler task, every
  minute, "Run whether user is logged on or not", running
  `D:\xampp\php\php.exe D:\xampp\htdocs\Next\backend-laravel\artisan schedule:run`. Nothing else is needed for
  backups. The old `POST /api/backups/scheduled-run` URL (header `X-Backup-Cron-Token: <BACKUP_CRON_SECRET>`)
  still works for installs that trigger backups from an outside timer.
- **Health check.** `GET /up`. `GET /api/health` also reports `background.scheduler` as `running`, `stale`
  or `never`; `never` or `stale` means the cron above is missing or failing.

## Alerts

- **Error alerts:** errors reach admins' notification bell by themselves (`ops:error-alerts` runs from
  the cron). To get them by email too, set `OPS_ALERT_EMAIL` and the `MAIL_*` settings in the server's `.env`.
- **Downtime:** set up an external uptime monitor (any free one) on `https://dev.gpsoftware.in/api/health`,
  because a site that is down can't send its own alert. Have it alert on a non-200 response, or on a body
  without `"scheduler":"running"`.

## Rollback

Each deploy keeps a code archive and a database backup in `~/.gp-erp-recovery/` on the server. To roll
back the code, unpack the previous `code-*.tar.gz` into the app folder and rebuild the caches
(`config:cache`, `route:cache`, `view:cache`). Restore the database only if a migration has to be
undone.
