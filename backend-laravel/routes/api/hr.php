<?php

use App\Http\Controllers\Api\V1\Hr\AttendanceController;
use App\Http\Controllers\Api\V1\Hr\EmployeeController;
use App\Http\Controllers\Api\V1\Hr\HrConfigurationController;
use Illuminate\Support\Facades\Route;

// HR designations, departments, sections, employees and attendance.
// Loaded inside the authenticated app-route group in routes/api.php.

// HR Designations, Departments & Sections
Route::get('hr-designations/{id}', [HrConfigurationController::class, 'designationsShow']);
Route::put('hr-designations/{id}', [HrConfigurationController::class, 'designationsUpdate']);
Route::delete('hr-designations/{id}', [HrConfigurationController::class, 'designationsDestroy']);
Route::get('hr-designations', [HrConfigurationController::class, 'designationsIndex']);
Route::post('hr-designations', [HrConfigurationController::class, 'designationsStore']);

Route::get('hr-departments/{id}', [HrConfigurationController::class, 'departmentsShow']);
Route::put('hr-departments/{id}', [HrConfigurationController::class, 'departmentsUpdate']);
Route::delete('hr-departments/{id}', [HrConfigurationController::class, 'departmentsDestroy']);
Route::get('hr-departments', [HrConfigurationController::class, 'departmentsIndex']);
Route::post('hr-departments', [HrConfigurationController::class, 'departmentsStore']);

Route::get('hr-sections/{id}', [HrConfigurationController::class, 'departmentsShow']);
Route::put('hr-sections/{id}', [HrConfigurationController::class, 'departmentsUpdate']);
Route::delete('hr-sections/{id}', [HrConfigurationController::class, 'departmentsDestroy']);
Route::get('hr-sections', [HrConfigurationController::class, 'departmentsIndex']);
Route::post('hr-sections', [HrConfigurationController::class, 'departmentsStore']);

Route::match(['get', 'post', 'put', 'delete'], 'hr-{type}/{id?}', [HrConfigurationController::class, 'handleType']);
// Employees
Route::get('employees/dashboard-summary', [EmployeeController::class, 'dashboardSummary']);
Route::post('employees/{id}/upload', [EmployeeController::class, 'uploadDocument']);
Route::post('employees/{id}/education-certificate', [EmployeeController::class, 'educationCertificate']);
Route::get('employees/{id}/document-url', [EmployeeController::class, 'documentUrl']);
Route::get('employees/grouped', [EmployeeController::class, 'groupedSummary']);
Route::apiResource('employees', EmployeeController::class);

// Attendance
Route::get('attendance/today', [AttendanceController::class, 'today']);
Route::post('attendance/check-in', [AttendanceController::class, 'checkIn']);
Route::post('attendance/check-out', [AttendanceController::class, 'checkOut']);
Route::post('attendance/mark-leave', [AttendanceController::class, 'markLeave']);
Route::match(['get', 'post', 'put'], 'attendance/settings', [AttendanceController::class, 'settings']);
