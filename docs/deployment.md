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
3. Runs `platform:verify-trust`. If it fails, the site stays in maintenance mode on purpose.
4. Asks the database for its migration status up to 4 times (5, 10, 15 and 20 seconds apart). If it never
   answers, nothing is migrated and the site is brought back up on the new code.
5. Runs `migrate --force`. If it fails, the site stays in maintenance mode, because a migration that stopped
   part way needs a person to look at it.
6. Rebuilds the config, route and view caches and restarts the queue. A failure here brings the site back up.
7. Brings the site up, then asks `/api/health` up to 4 times, 15 seconds apart. `/api/health` answers 503 in
   maintenance mode and 200 when the app is live (`/up` serves the web page either way). If it never answers
   200, the site goes back into maintenance mode.

Any failure after step 2 fails the job, so a red run means the release needs a look even when the site came
back up. See "Rollback" below.

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
- **On-prem server with cloud failover.** On the store PC:
  1. Backend `.env`: `SYNC_NODE_ROLE=local` and `SYNC_CLOUD_API_BASE_URL=https://<the company's cloud>/api`
     (default dev.gpsoftware.in). The counters reach it through the Vite server on the same PC.
  2. Frontend `.env` (or the environment of the Vite process): `VITE_API_PROXY_TARGET` (the backend, e.g.
     `http://127.0.0.1:8000`), `VITE_FAILOVER_CLOUD_API_URL=https://dev.gpsoftware.in/api` and
     `VITE_ALLOWED_HOSTS=mainserver` (the name the billing PCs use). Serve the production build, not the dev
     server: `npm run build`, then `npm run preview -- --host --port 5173` (same proxy and hosts as `vite`;
     run it from Task Scheduler at start-up). Rebuild after each update; counters pick up the new build.
  3. The Task Scheduler entry above (`schedule:run` every minute) runs the 15-second `sync:cycle`.
  4. Open the counter address. A fresh server shows **Connect to cloud**: sign in with an administrator of the
     cloud ERP (choose the store if they have several). The cloud hands over the company activation and the
     store's licence, then the staff accounts and data; staff sign in with their cloud accounts. Do not activate
     an on-prem server through Vynerix admin: it allows one installation per company, which is the cloud.
     Later, admins use Configure Local Server for Sync now, Re-copy from cloud, Pause sync and Reconnect.
  5. **Each counter** (so billing opens even when the main server PC is off): Configure Local Server >
     **Download counter installer** on the main server, copy the zip to the counter, unzip it to a permanent
     folder (e.g. `C:\Vynerix`) and run `install_autostart.bat` (needs Node.js, like the print connector). It
     starts with Windows, adds the desktop shortcut **Vynerix Billing** (`http://localhost:5050`) and keeps its
     copy of the app current from the main server. Staff sign in once on that shortcut.

  The cloud address must be public (https://dev.gpsoftware.in): Chrome refuses calls from a page it considers
  public to a private LAN address, and a PC name can resolve to a public IPv6 address.

  The cloud allows the counters' address by itself when it is a machine name without dots (`http://mainserver:5173`);
  add a dotted intranet address to `CORS_EXTRA_ORIGINS` in the cloud's `.env`.
- **Health check.** `GET /up`. `GET /api/health` also reports `background.scheduler` as `running`, `stale`
  or `never`; `never` or `stale` means the cron above is missing or failing.

## Alerts

- **Error alerts:** errors reach admins' notification bell by themselves (`ops:error-alerts` runs from
  the cron). To get them by email too, set `OPS_ALERT_EMAIL` and the `MAIL_*` settings in the server's `.env`.
- **Downtime:** set up an external uptime monitor (any free one that checks every 5 minutes or faster), because a
  site that is down can't send its own alert. Watch these three addresses, and alert when a check fails twice in
  a row (one slow answer is common on shared hosting):

  | Address | Healthy answer | A failure means |
  |---|---|---|
  | `https://dev.gpsoftware.in/api/health` | 200 and the text `"scheduler":"running"` | Down, in maintenance mode (503), or the cron stopped |
  | `https://admin.gpsoftware.in/api/health` | 200 and the texts `"scheduler":"running"` and `"queue":"running"` | Vynerix Admin is down or its cron or queue stopped |
  | `https://remote.gpsoftware.in/` | 200 and the text `Vynerix Remote Tool` | The remote support tool is down, or its DNS points somewhere else |

  Send the alert to an email address that is not on the same Hostinger account.

## Rollback

Work from the least to the most drastic step, and stop as soon as the site is healthy. The app folder is
`~/domains/dev.gpsoftware.in/public_html`; run the commands over SSH (hPanel > Advanced > SSH Access) with
`PHP=/opt/alt/php84/usr/bin/php`.

**1. The site shows the maintenance page after a failed deploy.** Read the red step in the GitHub Actions run.
- A database that could not be reached, or a cache step: the script has already brought the site back up.
  Re-run the failed jobs once the database answers.
- `platform:verify-trust` or `migrate` failed: the site is held in maintenance on purpose. Fix the cause, then
  re-run the jobs, or bring the site up by hand with `$PHP artisan up` only when you are sure the database
  matches the code that is on the server.

**2. A release is live but wrong.** Redeploy the last good commit. This is the safest way, because it rebuilds
the full package (code, `vendor/` and the frontend) in one go:
- GitHub > Actions > the last green run > **Re-run all jobs**, or
- `git revert <bad commit>` and push.

**3. GitHub is not available, or a deploy is needed in minutes.** Roll the code back from the archive the last
deploy kept in `~/.gp-erp-recovery/`:

```
cd ~/domains/dev.gpsoftware.in/public_html
ls -lt ~/.gp-erp-recovery/code-*.tar.gz | head -3        # newest first; pick the one from before the bad release
$PHP artisan down --retry=60
tar -xzf ~/.gp-erp-recovery/code-<timestamp>-<id>.tar.gz -C .
$PHP artisan config:clear
$PHP artisan config:cache && $PHP artisan route:cache && $PHP artisan view:cache
$PHP artisan queue:restart
$PHP artisan up
curl -s https://dev.gpsoftware.in/api/health               # expect "status":"UP" and "scheduler":"running"
```

What the code archive holds: the app folder without `.env`, `storage/`, `vendor/` and the compiled caches.
So it brings back the code and the built frontend (`public/`), not the Composer packages. If the bad release
changed `composer.lock`, use step 2 instead. Files that the bad release added stay on the server as harmless
leftovers.

**4. A migration damaged data.** Restoring a database backup undoes everything saved after it was taken,
including bills made since the deploy, so prefer a corrective migration. If a restore is the only way:
- Backups are `~/.gp-erp-recovery/database-<timestamp>-<id>.sql.gz`, taken just before each deploy.
- Put the site in maintenance mode first (`$PHP artisan down --retry=60`), then restore into the database named
  in the server's `.env`: `gunzip -c <backup file> | mysql -u <DB_USERNAME> -p <DB_DATABASE>`.
- Roll the code back to the same point (step 2 or 3) before bringing the site up, so the code and the schema
  match.

The deploy never deletes the archives, so remove old ones now and then (Hostinger's disk is limited). After any
rollback, check `/api/health` and sign in once.
