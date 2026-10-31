# GPRETAIL

A multi-store retail ERP: a Laravel 13 API (`backend-laravel/`) and a React 19 + Vite + MUI app
(`frontend/`) covering POS billing (including offline), warehouse and purchasing, CRM, double-entry
accounting, store transfers, purchase orders, HR and reporting. The app also has a mobile workspace
at `/app`.

## Documentation

| Doc | What it covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | How a request flows, store isolation, main business flows, scheduled jobs |
| [docs/folder-structure.md](docs/folder-structure.md) | Where code lives and the naming rules |
| [docs/api-reference.md](docs/api-reference.md) | Every API endpoint by module |
| [docs/deployment.md](docs/deployment.md) | CI/CD to Hostinger, server setup, rollback |
| [docs/testing.md](docs/testing.md) | Test suites and how to run them |

## Local development

Backend (served by XAMPP Apache, or `php artisan serve` for a quick start):

```bash
cd backend-laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
```

Frontend (Vite dev server on http://localhost:5173, proxying `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Tests: `vendor/bin/phpunit` in `backend-laravel/` and `npm test` in `frontend/`. See
[docs/testing.md](docs/testing.md).

## Deployment

A push to `main` runs the CI pipeline and deploys to Hostinger. See
[docs/deployment.md](docs/deployment.md).
