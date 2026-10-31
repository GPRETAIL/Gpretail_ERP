# End-to-end smoke tests (Playwright)

These drive the real app in Chrome: Vite on `:5173` proxying to the Laravel API, signed in as the
users of a disposable **test store**. They are not part of `npm test` or CI.

## Before running

1. The backend is up (`http://127.0.0.1:8000`, see `.claude/launch.json` → `erp-frontend`), and
   `npm run dev` is serving the frontend on `http://localhost:5173`.
2. A test store exists with a cashier and a manager and a pack barcode with stock. Locally that is
   the `TEST_01` store from the local seed script (users `testcashier`, `testmanager`, barcode
   `TEST-SHIRT`). Never point this at a production store.
3. Chrome is installed (the suite uses it instead of downloading a browser).

## Run

```bash
E2E_PASSWORD='<test users password>' npm run test:e2e
```

Optional environment: `E2E_BASE_URL`, `E2E_CASHIER`, `E2E_MANAGER`, `E2E_STORE_ID` (default 2),
`E2E_OTHER_STORE_ID` (a store the users are not assigned to, default 1), `E2E_BARCODE`,
`E2E_HEADED=1` to watch, `E2E_BROWSER_CHANNEL` (default `chrome`).

Every test undoes what it creates (the bill is deleted, the transfer cancelled, the voucher
deleted), so the store's stock and books end where they started. POS returns and supplier payments
cannot be deleted, so those are covered by the backend feature tests instead.
