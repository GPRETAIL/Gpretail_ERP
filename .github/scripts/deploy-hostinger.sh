#!/usr/bin/env bash
set -euo pipefail
: "${SSH_HOST:?SSH host is required}"
: "${SSH_USER:?SSH username is required}"
: "${SSH_PORT:?SSH port is required}"
: "${APP_DIR:?ERP application directory is required}"
: "${HOST_KEY_FINGERPRINT:?Verified host fingerprint is required}"
[[ "$SSH_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || { echo '::error::Invalid SSH host'; exit 1; }
[[ "$SSH_USER" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo '::error::Invalid SSH username'; exit 1; }
[[ "$SSH_PORT" =~ ^[0-9]+$ ]] || { echo '::error::Invalid SSH port'; exit 1; }
umask 077
SSH_DIR=$(mktemp -d)
trap 'rm -f -- "$SSH_DIR/known_hosts" "$SSH_DIR/deploy_key"; rmdir -- "$SSH_DIR"' EXIT
# Only trust the ED25519 key whose fingerprint the operator configured.
ssh-keyscan -T 15 -p "$SSH_PORT" -t ed25519 "$SSH_HOST" > "$SSH_DIR/known_hosts"
ACTUAL_FINGERPRINT=$(ssh-keygen -lf "$SSH_DIR/known_hosts" -E sha256 | awk '{print $2}')
EXPECTED_FINGERPRINT=$(printf '%s' "$HOST_KEY_FINGERPRINT" | tr -d '\r\n')
if [[ "$ACTUAL_FINGERPRINT" != "$EXPECTED_FINGERPRINT" ]]; then
  echo '::error::SSH ED25519 host key does not match HOSTINGER_SSH_FINGERPRINT'
  exit 1
fi
SSH_OPTIONS=(-o "UserKnownHostsFile=$SSH_DIR/known_hosts" -o GlobalKnownHostsFile=/dev/null -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
[[ "$APP_DIR" =~ ^/[a-zA-Z0-9/_.-]+$ ]] || { echo '::error::Invalid ERP application directory'; exit 1; }
: "${SSH_KEY:?ERP SSH private key is required}"
printf '%s\n' "$SSH_KEY" > "$SSH_DIR/deploy_key"
SSH_OPTIONS+=(-i "$SSH_DIR/deploy_key" -o IdentitiesOnly=yes -o BatchMode=yes)
ssh "${SSH_OPTIONS[@]}" -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" 'umask 077; mkdir -p "$HOME/.gp-erp-recovery"; chmod 700 "$HOME/.gp-erp-recovery"'
scp -O "${SSH_OPTIONS[@]}" -P "$SSH_PORT" deploy.tar.gz .github/scripts/backup-erp.php "$SSH_USER@$SSH_HOST:.gp-erp-recovery/"
ssh "${SSH_OPTIONS[@]}" -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "bash -se -- '$APP_DIR'" <<'REMOTE_DEPLOY'
set -euo pipefail
APP_DIR=$(realpath "$1")
case "$APP_DIR" in
  "$HOME"/domains/*) ;;
  *) echo 'ERP directory must be inside this hosting account domains directory'; exit 1 ;;
esac
PHP=/opt/alt/php84/usr/bin/php
RECOVERY_DIR="$HOME/.gp-erp-recovery"
ARCHIVE="$RECOVERY_DIR/deploy.tar.gz"
test -x "$PHP" && test -s "$ARCHIVE"
cd "$APP_DIR"
test -f artisan && test -f .env && test -f composer.json
umask 077
export ERP_DEPLOY_APP_DIR="$APP_DIR"
"$PHP" "$RECOVERY_DIR/backup-erp.php"
CODE_BACKUP="$RECOVERY_DIR/code-$(date -u +%Y%m%dT%H%M%SZ)-$$.tar.gz"
tar -czf "$CODE_BACKUP" --exclude='./.env' --exclude='./.env.*' --exclude='./storage' --exclude='./bootstrap/cache/*.php' --exclude='./vendor' --exclude='./.git' --exclude='./node_modules' --exclude='./deploy.zip' --exclude='./deploy.tar.gz' -C "$APP_DIR" .
test -s "$CODE_BACKUP"
"$PHP" artisan down --retry=60
# A failed step after "down" must not leave the shop on the maintenance page. The new code is already unpacked, so
# bring the site back up and still fail the job, so the failure is seen. (A migrate that broke halfway is the one case
# where this is not wanted: the next block marks that case and keeps the site down.)
KEEP_DOWN=1 # until the licence trust check below has passed: a failed trust check must never reopen the site
on_fail() {
  status=$?
  trap - ERR
  if [ "$KEEP_DOWN" = "1" ]; then
    echo '::error::The site stays in maintenance mode until the failed step (trust check or migration) is checked'
  else
    "$PHP" artisan up || true
    echo '::error::Deploy step failed; the site was brought back up on the new code'
  fi
  exit "$status"
}
trap on_fail ERR
(umask 022; tar -xzf "$ARCHIVE")
"$PHP" artisan config:clear
"$PHP" artisan platform:verify-trust
KEEP_DOWN=0
# The database is sometimes unreachable for a moment on shared hosting ([2002]). Retry the connection, never a migration
# that has started: only a run that could not connect at all is repeated.
REACHED=0
for attempt in 1 2 3 4; do
  if "$PHP" artisan migrate:status >/dev/null 2>&1; then
    REACHED=1
    break
  fi
  sleep $((attempt * 5))
done
if [ "$REACHED" != "1" ]; then
  echo '::error::The database could not be reached after 4 tries (nothing was migrated)'
  false
fi
KEEP_DOWN=1
"$PHP" artisan migrate --force --no-interaction
KEEP_DOWN=0
"$PHP" artisan config:cache
"$PHP" artisan route:cache
"$PHP" artisan view:cache
"$PHP" artisan queue:restart
"$PHP" artisan up
if ! curl --fail --silent --show-error --max-time 20 https://dev.gpsoftware.in/up >/dev/null; then
  "$PHP" artisan down --retry=60
  exit 1
fi
rm -- "$ARCHIVE" "$RECOVERY_DIR/backup-erp.php"
REMOTE_DEPLOY
