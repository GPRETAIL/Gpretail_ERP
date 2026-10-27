# Backup and local-server review — 27 October 2026

## Verified fixes

- Local-server polling now uses the shared pending/queued request lifecycle.
  Background status updates preserve edited URLs, outbox reads are canceled when
  their selected node changes, and unhealthy HTTP 200 probe results show errors.
  Save updates browser runtime configuration. URL validation rejects embedded
  credentials/query strings; a trailing `/api` remains compatible. The saved
  cloud address is honored by browser routing and the local sync worker.
- Backup overview masks OCI secrets and hides encrypted schedule-password blobs.
  Resubmitting masked values preserves stored secrets. Empty per-store OCI
  settings no longer break bulk schedule settings. Weekday/time/retention inputs
  are validated before scheduling, including preventing an invalid weekly day
  from looping indefinitely.
- Backup form scope uses the selected authorized store without changing the
  workspace store. Authorized tenant administrators can select stores. Archive
  requests stay on their originating local/cloud node; a failed lookup never
  retries a node-local archive ID on another database. Long jobs have a three
  minute client timeout and duplicate create/restore/import clicks are guarded.
- Cloud-only and hybrid restores can fetch their missing local archive from OCI;
  temporary downloads/decryption files are cleaned up. Explicit restore targets
  are authorized independently, with existing record-ID collision guards kept.
- Exports support tables with only `store_id`. Legacy child rows with NULL
  ownership columns are scoped through their registered parent, without accepting
  a conflicting explicit store. Restores order foreign-key prerequisites first
  and validate incoming/existing row ownership in batches. Global installation
  permission definitions remain preserved and are reported as skipped.
- Backup operations/settings are excluded from sync outbox capture: archive IDs,
  restores and OCI/encryption credentials must never be replayed to another node.

## Validation and live configuration

The frontend full run passed 537 tests. Full backend run passed 326 tests;
subsequent focused run passed 41 tests including an added POS recovery case.
Lint, PHP formatting and production build passed. Tests use disposable SQLite
records, including an encrypted full archive, five-item POS invoice/payment/
inventory recovery, cloud-download simulation, ownership collision rejection,
and masked-secret preservation. No production restore or archive creation ran.

At 11:26 IST, all five live backup/local-config/nodes/outbox API reads returned
200. The checked Coffee store had zero backups, scheduling disabled, no OCI backup
credentials, no backup cron secret, no enabled local node and no heartbeat.
The short-lived verification token was revoked. Those missing settings need
installation/configuration; an empty health/history table is expected.

## Deployment limits requiring a real installation test

The server-side LAN probe needs an explicitly approved endpoint and network
reachability. A public cloud host cannot ordinarily reach a counter's private
LAN. Connector/browser health and server-side reachability are different checks.
OCI upload/download against the customer's bucket remains unverified because
credentials are not configured; tests simulate the cloud download.

Transparent cross-database browser sign-in/failover is not established by these
checks. Sanctum tokens are stored per database; current routing can forward the
same bearer token to the alternate node, while token tables are excluded from
catch-up sync. A secure per-node authentication handoff and a staged two-server
offline/reconnect test are required before promising automatic local/cloud
operation. The sync worker's per-node credential protocol is separately tested;
it does not itself authenticate a customer's browser on the other database.

Physical browser/installation validation remains unavailable through the current
automation runtime. Existing intermittent hosting MySQL connection failures are
a separate infrastructure issue.
