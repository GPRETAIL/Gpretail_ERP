<?php

namespace Config;

use CodeIgniter\Routing\RouteCollection;

/**
 * @var RouteCollection $routes
 */

$routes = Services::routes();

// Default settings
$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('Dashboard');
$routes->setDefaultMethod('index');
$routes->setTranslateURIDashes(true);
$routes->set404Override();
$routes->setAutoRoute(true); // Turn ON if you want to allow controller auto-discovery

// ---- Custom Defined Routes ----

// Dashboard
$routes->get('/', 'Dashboard::index');
$routes->get('dashboard', 'Dashboard::index');
$routes->get('posview', 'Dashboard::posview');

// Authentication
$routes->get('login', 'Auth::login');
$routes->post('login', 'Auth::login'); // if you have form post login
$routes->get('logout', 'Auth::logout');

// ✅ Forgot/Reset Password - must be outside group!
$routes->match(['get', 'post'], 'forgot', 'AuthController::forgot');
$routes->match(['get', 'post'], 'reset-password/(:any)', 'AuthController::resetPassword/$1');

// Customers
$routes->get('customers', 'Customers::index');
$routes->get('customers/create', 'Customers::create');
$routes->post('customers/create', 'Customers::create');
$routes->get('customers/edit/(:num)', 'Customers::edit/$1');
$routes->post('customers/edit/(:num)', 'Customers::edit/$1');
$routes->get('customers/delete/(:num)', 'Customers::delete/$1');

// Products or Combooffers
$routes->get('combooffers', 'Combooffers::index');
$routes->get('combooffers/create', 'Combooffers::create');
$routes->post('combooffers/create', 'Combooffers::create');
$routes->get('combooffers/edit/(:num)', 'Combooffers::edit/$1');
$routes->post('combooffers/edit/(:num)', 'Combooffers::edit/$1');
$routes->get('combooffers/delete/(:num)', 'Combooffers::delete/$1');

// Combooffer Single (if needed separately)
$routes->get('combooffer', 'Combooffer::index');
$routes->get('combooffer/create', 'Combooffer::create');
$routes->post('combooffer/create', 'Combooffer::create');

// Expenses
$routes->get('expences', 'Expences::index');
$routes->get('expences/create', 'Expences::create');
$routes->post('expences/create', 'Expences::create');

// Backup and Cron Jobs
$routes->get('incremental-backup', 'BackupController::incremental_backup');
$routes->get('full-backup', 'BackupController::full_backup');
$routes->get('backup-new/full', 'BackupControllerNew::full_backup');
$routes->get('backup-new/incremental', 'BackupControllerNew::incremental_backup');

$routes->get('cron/run', 'Cron::run');
$routes->get('cron/backup', 'Cron::backup');

// Clear / Database Clear
$routes->get('clear', 'Clear::index');
$routes->get('cleardb', 'Cleardatakarbase::index');

// Closing Registers
$routes->get('closeregister', 'Closeregister::index');
$routes->get('closeregister/close/(:num)', 'Closeregister::close/$1');
$routes->post('closeregister/close/(:num)', 'Closeregister::close/$1');

// 404 custom error
$routes->get('404', 'Error404::index');

// Excel Import
$routes->get('import-excel', 'ExcelReader2::load');

// CAPTCHA Routes
$routes->get('captcha-form', 'CaptchaController::showForm');
$routes->get('captcha', 'CaptchaController::generateCaptcha');
$routes->post('verify-captcha', 'CaptchaController::verifyCaptcha');

// Log Routes
$routes->group('log', function($routes) {
    $routes->get('viewall', 'LogController::viewAll');
    $routes->get('view/(:num)', 'LogController::view/$1');
    $routes->get('print/(:num)', 'LogController::printView/$1');
    $routes->get('edit/(:num)', 'LogController::edit/$1');
    $routes->post('update/(:num)', 'LogController::update/$1');
    $routes->match(['get', 'post'], 'sync', 'LogController::sync');
});

// Categories Routes
$routes->get('categories', 'Categories::index');
$routes->post('categories/add', 'Categories::add');
$routes->post('categories/addajax', 'Categories::addajax');
$routes->match(['get', 'post'], 'categories/edit/(:num)', 'Categories::edit/$1');
$routes->get('categories/delete/(:num)', 'Categories::delete/$1');

// Sales Routes
$routes->get('sales', 'Sales::index');

// Expense Categories
$routes->get('categorie_expences', 'ExpenseCategoriesController::index');
$routes->post('categorie_expences/add', 'ExpenseCategoriesController::add');
$routes->match(['get', 'post'], 'categorie_expences/edit/(:num)', 'ExpenseCategoriesController::edit/$1');
$routes->get('categorie_expences/delete/(:num)', 'ExpenseCategoriesController::delete/$1');

// Offers routes (grouped under 'offers')
$routes->group('offers', ['namespace' => 'App\Controllers'], function ($routes) {
    $routes->get('/', 'Offers::index');
    $routes->get('add', 'Offers::add');
    $routes->post('store', 'Offers::addtodbb');
    $routes->get('edit/(:num)', 'Offers::edit/$1');
    $routes->post('update/(:num)', 'Offers::updateedit/$1');
    $routes->get('delete_offer/(:num)', 'Offers::delete_offer/$1');

    $routes->post('addrowret', 'Offers::addrowret');
    $routes->post('addrow', 'Offers::addrow');
    $routes->post('addrowphy', 'Offers::addrowphy');

    $routes->post('addtodbb', 'Offers::addtodbb');
    $routes->post('addtodbbraw', 'Offers::addtodbbraw');
    $routes->post('addtodbbphy', 'Offers::addtodbbphy');

    $routes->post('stockadd', 'Offers::stockadd');
    $routes->post('stockadd_raw', 'Offers::stockadd_raw');

    $routes->get('findState', 'Offers::findState');
    $routes->get('findStatebran', 'Offers::findStatebran');
    $routes->get('findcctn', 'Offers::findcctn');
    $routes->get('findcctnqqty', 'Offers::findcctnqqty');
    $routes->get('findssss', 'Offers::findssss');
    $routes->get('findssss_raw', 'Offers::findssss_raw');
    $routes->get('findchange', 'Offers::findchange');

    $routes->get('offers', 'OffersController::index');
});
