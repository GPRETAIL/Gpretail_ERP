# GP Admin integration — implementation progress

## First implementation phase: mandatory store context

Implemented in Next ERP source:

- HTTP store resolution after authentication on both /api and /api/v1 business routes.
- Zero assigned stores blocks business writes; one store is selected automatically; multiple stores require an explicit selection.
- Store-bound users cannot select another store; inactive stores reject operational writes.
- Auth responses expose available store IDs and no longer default missing assignment to store 1.
- The existing dedicated-deployment company owner is provisioned without an arbitrary first-store assignment.
- Directly store-owned Eloquent queries are filtered by authorised/selected store. Saving assigns server-validated ownership and rejects changing an existing record's store.
- Foreign-key relationships to directly store-owned parents are checked on Eloquent saves.
- Missing-store errors open a desktop/mobile chooser. Selection warns before reopening the form and never retries the failed write silently.
- Active store selection is per browser tab; login/logout clears it and profile refresh preserves only an authorised selection.
- Sync capture uses resolved store context, without a store-1 fallback.
- Migration adds ownership to previously global business masters. Old unassigned records are backfilled only when exactly one store makes ownership unambiguous.

## Rollout state

Validation: 22 targeted backend tests (70 assertions), 14 targeted frontend tests, lint for the new frontend components/utilities, and the production frontend build passed. The full application suite and browser walkthrough are not claimed by these checks.

The ownership migration was applied to the local `next_erp` database on 15 October 2026. Verification checked all 14 affected tables: 35 existing records belong to the installation's single store (ID 2), with zero unassigned records and zero invalid store references. A pre-migration schema/data snapshot is saved at `backend-laravel/storage/app/private/migration-backups/store-ownership-20261014-230920.json`. The frontend build is generated in frontend/dist, not copied into backend-laravel/public.

Before applying the migration to a multi-store database, reconcile unassigned historical master records with their intended store. They will otherwise be excluded by store-scoped model reads. The migration never guesses their ownership. Existing uniqueness rules on some master codes still span stores and need a separate schema/controller migration for independently reusable codes.

## Second implementation phase: company onboarding

Implemented on 15 October 2026:

- Both GP Admin company-creation paths queue a welcome link instead of emailing a login password. Links expire after 24 hours, are stored as hashes and are consumed atomically. Welcome jobs are encrypted and have retry/backoff settings; an administrator can resend a pending welcome link.
- The public onboarding page lets the owner set their initial ERP and company-portal credentials, then displays a separate one-use local registration code and the company/client IDs. It shows the configured ERP address or installation-pending guidance.
- Dedicated company-portal login now calls the existing portal endpoint. Public password-reset requests no longer disclose reset tokens or URLs in their response.
- ERP registration is bound to the configured company; it retains its sync credential and can recover from a failed initial snapshot without redeeming the activation code again. A different company cannot take over an already bound installation.
- ERP tracks company identity and adopted password version. Repeated snapshots do not overwrite a locally changed password. A conflicting unbound local account is rejected rather than taken over.
- A new platform-managed owner cannot access unlinked legacy local stores. Explicit store provisioning/linking was added in the following phases.
- First successful managed ERP login contacts GP Admin with a company-scoped sync token and atomically starts an unpaid 14-day trial once. Explicit commercial dates and valid paid store subscriptions are preserved.
- Tenant Admin has a My Subscription link to the configured GP Admin portal.

The additive onboarding migrations have been applied to local `gpretail_admin` and `next_erp`; the separate `vx_admin` transactional test database also has the Admin migration. Existing company dates and local account passwords were not rewritten by those migrations.

Local GP Admin welcome links now use `http://127.0.0.1:5173`; Next ERP calls its running API at `http://127.0.0.1:8130`. Previous `.env` files are backed up under each backend's `storage/app/private/config-backups/before-company-onboarding.env`. Set publicly reachable GP Admin and appropriate LAN ERP addresses before use by other computers/customers.

Actual email delivery is not enabled locally: GP Admin uses `MAIL_MAILER=log` and `QUEUE_CONNECTION=sync`. Configure the real mail transport before expecting inbox delivery. Email delivery has been tested with fake transports, not by sending customer emails.

Validation includes the onboarding/portal/snapshot tests, ERP activation/password retry/store-context tests, onboarding-page interaction tests, TypeScript checking, all three frontend builds and a browser check of the new ERP-address field. No real customer onboarding was performed in the operational database.

## Third phase: store and warehouse provisioning

Implemented on 15 October 2026:

- Both GP Admin store-creation routes now use one transactional service, enforce the company store limit, and create pending stores with a hashed one-use activation code and a 30-day activation deadline. Paid terms can be 1, 3, 6 or 12 calendar months; an administrator can choose a fixed commercial deadline instead.
- Activation email goes to Tenant Admin, with an optional explicit store-manager copy. It contains the store code and activation instructions rather than a login password or client secret. Pending-email resend rotates only the activation code; it does not restart the term or change the tenant password.
- ERP Store Activation is available to the registered Tenant Admin even with no active store. It refreshes pending stores and redeems the code through the local backend using a company-scoped sync credential. GP Admin locks the company/store, binds the installation UUID, consumes the code and establishes the store term. Authenticated retry on the same installation recovers without extending dates.
- ERP upserts by platform store ID and company code, preserves distinct local IDs, refuses collisions with unlinked legacy stores, and disables removed/suspended/expired stores. Managed store creation/deletion and licence identity remain authoritative in GP Admin.
- Trial stores inherit the existing company trial deadline. Adding a store cannot restart a trial. Paid stores can outlive the company's earlier trial date.
- Warehouses require one parent store in the same company and use its licence. Creation queues an owner email. ERP imports the warehouse mapping during an owner refresh or scheduled sync; the parent must be activated and commercially active. The refresh is the initial confirmation; warehouses do not use a separate key or independent commercial term. Moving a provisioned warehouse to another store is rejected pending an explicit stock transfer.

Additive migrations were applied to local gpretail_admin, its separate vx_admin test database and next_erp. Existing legacy stores were not rebound automatically. The new system-configuration ownership migration backfills only a single-store installation.

## Fourth phase: signed store licence enforcement

- GP Admin signs company/store/installation-bound Ed25519 licences with subscription status, commercial expiry, plan entitlements, user limit and a capped offline deadline.
- ERP pins the public key in configuration and checks algorithm, signature, issuer, audience, store/company/deployment identity, state and timestamps. It verifies the certificate before enabling a synced store and rechecks it for authenticated business writes. Invalid/expired stores cannot write while valid sibling stores continue operating.
- Offline grace cannot exceed commercial expiry. Company suspension and cancelled store subscriptions block operational writes after sync; offline installations observe the bounded cached lease.
- Development signing/public keys are limited to local/testing. Production requires GP Admin APP_LICENCE_PRIVATE_KEY / APP_LICENCE_PUBLIC_KEY and ERP PLATFORM_LICENCE_PUBLIC_KEY. The ERP never receives the private key.
- The subscription-status endpoint now reports actual per-store status and dates instead of the former Enterprise/2028 placeholder.
- ERP schedules platform:sync every five minutes, and successful authenticated snapshots refresh the scoped sync credential so a six-month customer is not stranded by a 30-day bootstrap token. A running scheduler is still a host deployment requirement.

## Fifth phase: subscription portal and renewals

- Connected the company portal's previously missing subscription, plan, payment configuration/order/verification routes. Tenant Admin can review separate store deadlines and purchase 1/3/6/12-month terms.
- Replaced fake order IDs with actual provider order creation. Price comes from the server plan catalog or a company-scoped invoice; browser-supplied amounts do not grant a cheaper licence. Orders fail clearly when payment credentials are absent.
- Paid plans apply only after signature verification plus provider-confirmed capture, or a signed captured-payment webhook with matching order, amount and currency. Settlement locks the order and is idempotent across checkout/webhook retries.
- Renewals add calendar months after the later of now and the current store end. A sibling store/company is unchanged. Payment before initial activation retains the purchased term for activation rather than silently starting it early.
- Manual invoice settlement is transactional/idempotent and renews the invoice's store when present. The old company-wide extension for store invoices was removed.
- Fake recurring-mandate creation now returns an explicit unsupported response. Automatic recurring mandates and refunds are not implemented by these changes; verified one-off payments and manual renewal are supported.
- Provider integration reference: [Razorpay Orders API](https://github.com/razorpay/markdown-docs/blob/master/api/orders/create.md).

## Sixth phase: isolation and rollout checks

- Raw query paths in API reports/lookups and module dashboard services now receive validated store scope, including foreign-key ancestry for indirectly owned records. Derived-table scoping prevents a later OR filter from escaping the ownership filter. Nullable related records remain valid; conflicting legacy store_id/company_id values are excluded for reconciliation.
- Product/customer summary caches are separated by store scope. Customer and backup notifications now carry store ownership. Test fixtures were updated to represent explicitly owned records.
- System configurations are store-owned. User creation inherits the selected store/company, staff cannot grant administration rights, other-store users are not exposed through management endpoints, and managed tenants cannot create super_admin users. Signed store user limits are checked when creating/reactivating users.
- Anonymous local-server configuration changes are rejected. Tenant backup operations require administration rights; exports use selected ownership, and restore/sync cannot overwrite platform registration credentials. Managed archive restore rejects global/indirect-table restores and conflicting ownership until a validated tenant migration is available.
- Builds pass for ERP, GP Admin and the separate company portal. Targeted activation/store-selection UI tests pass. Browser verification confirmed the six-month store option without creating a customer store. Screenshot: D:/xampp/htdocs/Gpretail_Admin/store-subscription-verified.png.

## Remaining rollout work

This remains a one-company-per-ERP-installation implementation. Before enabling it for existing customer data:

- Other legacy companies/accounts still require explicit identity reconciliation. No account takeover or guessed store-data reassignment is performed. See the verified local mapping below.
- Configure real SMTP and the intended queue worker. Local mail is still logged, not delivered to an inbox. Configure real Razorpay keys/webhook and production signing keys; test provider delivery before accepting customer payments.
- Run Laravel's scheduler on the on-prem host; defining a five-minute schedule does not install a Windows service/task. Use reachable GP Admin/ERP URLs and HTTPS for remote customers.
- Finish richer multi-store memberships, detailed module/permission enforcement from plan entitlements, company-wide seat policies, per-store uniqueness rules for independently reusable master codes, explicit cross-store transfers and validated cross-store/indirect archive restore.
- Audit every import/background job for explicit originating-store identity and execution-time licence checks. The HTTP protections do not by themselves license arbitrary CLI/jobs. Warehouses are provisioned mappings in this phase; richer warehouse-level stock allocation and independently deployed warehouse licensing are separate work.

Do not describe these source changes as a production deployment or real email/payment verification. No real customer email, payment or customer onboarding was performed during testing.

## Verified local legacy registration

On 15 October 2026, read-only checks found that ERP's saved registration belongs to Vinoth Super Retail (CMP-WG48MX), with a matching GP Admin client ID and existing Tenant Admin vinoth1300@gmail.com. The .env still pointed at the E2E test company. It was aligned to the saved registration, with a private before-change backup and configuration cache cleared.

The user explicitly instructed that local Theme Verify Store (THM_01, local ID 2) must remain separate from GP Admin Vinoth Retail Store 1 (STR-OJYUUU, platform ID 21). No store records were merged or reassigned.

Tested legacy-upgrade/link services and CLI commands were added. The registered company received a deployment UUID and a refreshed company-scoped sync credential. Its existing GP Admin store was upgraded to the signed-licence protocol with the same commercial expiry, and imported as a new local store (ID 3). The owner's existing account was linked without changing its password hash. Unlinked local accounts remain separated from managed store access.

Live post-change checks confirmed:

- Tenant Admin sees STR-OJYUUU as the company store.
- The imported store's Ed25519 licence verifies against the ERP pinned development public key and expires commercially on 31 December 2026.
- THM_01 retains its original ID, code, name and all store attributes, with null platform ownership.
- The Tenant Admin password hash is identical to its pre-link value. No password was retrieved or reset.

Private before-state backups are under each backend's storage/app/private/deployment-upgrades. Tokens/password hashes in those files must remain private. Existing unlicensed local stores are preserved for reconciliation/history; this is not a grant of a free operational licence to them.
