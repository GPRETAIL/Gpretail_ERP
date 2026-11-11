# Testing

| Suite | Where | Run | Notes |
|---|---|---|---|
| Backend feature and unit tests (PHPUnit) | `backend-laravel/tests/` | `php -d xdebug.mode=off vendor/bin/phpunit` | sqlite in memory; runs in CI |
| Static analysis (PHPStan level 5) | `backend-laravel/phpstan.neon` | `php -d memory_limit=2G vendor/bin/phpstan analyse` | 29 known findings at the time of the restructure |
| Frontend unit and component tests (Vitest) | `frontend/src/**/__tests__/` | `npm test` | jsdom; runs in CI |
| Frontend lint | `frontend/eslint.config.js` | `npm run lint` | runs in CI |
| End-to-end (Playwright) | `frontend/e2e/` | `E2E_PASSWORD=... npm run test:e2e` | drives the real app in Chrome against the local TEST_01 store; see `frontend/e2e/README.md`; not in CI |

## Local speed

XAMPP's `php.ini` loads Xdebug in debug mode, which makes every PHP process several times slower.
The backend suite takes about 1 minute with `-d xdebug.mode=off` and about 4.5 minutes without it.
`php artisan test` starts a child process that ignores `-d`, so call `vendor/bin/phpunit` directly.

## Where tests go

- **Backend:** `tests/Feature/<Module>/<Behaviour>Test.php`. Use `RefreshDatabase`, create a store and
  user, and sign in with `Sanctum::actingAs`. Send `X-Store-Id` on store-scoped requests.
- **Frontend:** in `__tests__/` beside the code. Mock `@/shared/api/apiClient` for API calls.
- **End-to-end:** each test cleans up what it creates, so the test store returns to its starting data.

## Checks for a structural change

Moving files must not change behaviour. These checks prove it:

- `php artisan route:list --json` gives the same routes, middleware and actions before and after.
  Comparing `--sort=definition` dumps also shows that overlapping routes did not change order.
- PHPStan shows the same findings.
- The full PHPUnit and Vitest suites, lint and `npm run build` all pass.

## Stock catalog and local-server regression checks

See [6 November 2026 QA cases and results](reports/2026-11-06-stock-and-local-server-qa.md) for the stock-switch matrix, explicit failover disabling, validation cases and remaining browser checks.

See [Coffee 1 live failover and invoice sync QA](reports/2026-11-06-coffee1-live-failover-qa.md) for the real two-database shutdown/restart test, fixes, and remaining browser authentication blocker.
