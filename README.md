# GPRETAIL / phpapp

Full-stack ERP system built with a **Unified Laravel 13 API Backend** and a **React 19 + Vite Frontend**.

---

## 🏗 Project Structure

- `backend-laravel/`: Laravel 13 REST API (Sanctum authentication, MariaDB / MySQL database, unified master lookup batch endpoints, inventory & billing workflows).
- `frontend/`: React 19 SPA (Vite, Tailwind CSS, Lucide icons, Shimmer Skeleton loading, hybrid high-speed search dropdowns).

---

## 🚀 Local Development

### 1. Backend (Laravel 13)
```bash
cd backend-laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```

### 2. Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Production Deployment (Hostinger / cPanel)

### 1. Build Frontend
```bash
cd frontend
npm run build
```
Copy `frontend/dist/*` into `backend-laravel/public/`.

### 2. Configure Hostinger Database (`backend-laravel/.env`)
```env
APP_NAME=GPRETAIL
APP_ENV=production
APP_DEBUG=false
APP_URL=https://dev.gpsoftware.in

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=u597975289_Dev
DB_USERNAME=u597975289_Dev
DB_PASSWORD=Saran@1300!
```

### 3. Run Migrations & Cache Optimization
```bash
cd backend-laravel
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```
