<?php

use App\Http\Controllers\Api\V1\Hr\AdditionalPayController;
use App\Http\Controllers\Api\V1\Hr\AttendanceController;
use App\Http\Controllers\Api\V1\Hr\EmployeeController;
use App\Http\Controllers\Api\V1\Hr\HolidayController;
use App\Http\Controllers\Api\V1\Hr\HrRequestController;
use App\Http\Controllers\Api\V1\Hr\LeaveApplicationController;
use App\Http\Controllers\Api\V1\Hr\LeavePolicyController;
use App\Http\Controllers\Api\V1\Hr\LeaveTypeController;
use App\Http\Controllers\Api\V1\Hr\MovementController;
use App\Http\Controllers\Api\V1\Hr\OvertimeController;
use App\Http\Controllers\Api\V1\Hr\PayrollController;
use App\Http\Controllers\Api\V1\Hr\PayrollReportController;
use App\Http\Controllers\Api\V1\Hr\PayrollSettingsController;
use App\Http\Controllers\Api\V1\Hr\RosterController;
use App\Http\Controllers\Api\V1\Hr\SalaryStructureController;
use App\Http\Controllers\Api\V1\Hr\SeparationController;
use App\Http\Controllers\Api\V1\Hr\IncomeTaxController;
use App\Http\Controllers\Api\V1\Hr\TaxDeclarationController;
use App\Http\Controllers\Api\V1\Hr\FinalSettlementController;
use App\Http\Controllers\Api\V1\Hr\StaffMoneyController;
use App\Http\Controllers\Api\V1\Hr\StaffAppController;
use App\Http\Controllers\Api\V1\Hr\StaffAppSetupController;
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
Route::get('attendance/me', [AttendanceController::class, 'me']);
Route::post('attendance/self-punch', [AttendanceController::class, 'selfPunch']);
Route::post('attendance/punch', [AttendanceController::class, 'punch']);
Route::post('attendance/mark', [AttendanceController::class, 'mark']);
Route::post('attendance/import', [AttendanceController::class, 'import']);
Route::get('attendance/punches', [AttendanceController::class, 'punches']);
Route::get('attendance/monthly', [AttendanceController::class, 'monthly']);

// Holidays and leave
Route::post('holidays/copy-year', [HolidayController::class, 'copyYear']);
Route::apiResource('holidays', HolidayController::class)->except(['show']);
Route::apiResource('leave-types', LeaveTypeController::class)->except(['show']);
Route::post('leave-policies/allocate', [LeavePolicyController::class, 'allocate']);
Route::apiResource('leave-policies', LeavePolicyController::class)->except(['show']);
Route::get('leave/mine', [LeaveApplicationController::class, 'mine']);
Route::get('leave/balances', [LeaveApplicationController::class, 'balances']);
Route::get('leave/ledger', [LeaveApplicationController::class, 'ledger']);
Route::post('leave-applications/{id}/approve', [LeaveApplicationController::class, 'approve']);
Route::post('leave-applications/{id}/reject', [LeaveApplicationController::class, 'reject']);
Route::post('leave-applications/{id}/cancel', [LeaveApplicationController::class, 'cancel']);
Route::get('leave-applications', [LeaveApplicationController::class, 'index']);
Route::post('leave-applications', [LeaveApplicationController::class, 'store']);

// Payroll
Route::get('payroll-runs', [PayrollController::class, 'index']);
Route::post('payroll-runs/prepare', [PayrollController::class, 'prepare']);
Route::get('payroll-runs/{id}', [PayrollController::class, 'show']);
Route::post('payroll-runs/{id}/submit', [PayrollController::class, 'submit']);
Route::post('payroll-runs/{id}/mark-paid', [PayrollController::class, 'markPaid']);
Route::post('payroll-runs/{id}/reopen', [PayrollController::class, 'reopen']);
Route::get('payroll-runs/{id}/report/{report}', [PayrollReportController::class, 'show']);
Route::get('payslips/{id}', [PayrollController::class, 'slip']);
Route::get('my-payslips', [PayrollController::class, 'mine']);
Route::get('my-payslips/{id}', [PayrollController::class, 'mySlip']);
Route::get('payroll/structures', [SalaryStructureController::class, 'index']);
Route::post('payroll/structures', [SalaryStructureController::class, 'store']);
Route::put('payroll/structures/{id}', [SalaryStructureController::class, 'update']);
Route::post('payroll/components', [SalaryStructureController::class, 'saveComponent']);
Route::put('payroll/components/{id}', [SalaryStructureController::class, 'saveComponent']);
Route::get('payroll/settings', [PayrollSettingsController::class, 'show']);
Route::put('payroll/settings', [PayrollSettingsController::class, 'update']);
Route::get('payroll/additional', [AdditionalPayController::class, 'index']);
Route::post('payroll/additional', [AdditionalPayController::class, 'store']);
Route::delete('payroll/additional/{id}', [AdditionalPayController::class, 'destroy']);

// Shift roster, overtime approval, staff requests, promotions and transfers (paths avoid the hr-{type} catch-all)
Route::get('shift-roster', [RosterController::class, 'week']);
Route::put('shift-roster/cell', [RosterController::class, 'set']);
Route::post('shift-roster/bulk', [RosterController::class, 'bulk']);
Route::post('shift-roster/copy-week', [RosterController::class, 'copyWeek']);
Route::get('overtime', [OvertimeController::class, 'index']);
Route::post('overtime/decide', [OvertimeController::class, 'decide']);
Route::get('staff-requests/mine', [HrRequestController::class, 'mine']);
Route::get('staff-requests', [HrRequestController::class, 'index']);
Route::post('staff-requests', [HrRequestController::class, 'store']);
Route::post('staff-requests/{id}/approve', [HrRequestController::class, 'approve']);
Route::post('staff-requests/{id}/reject', [HrRequestController::class, 'reject']);
Route::post('staff-requests/{id}/cancel', [HrRequestController::class, 'cancel']);
Route::get('employee-movements', [MovementController::class, 'index']);
Route::post('employee-movements', [MovementController::class, 'store']);
Route::post('employee-movements/{id}/cancel', [MovementController::class, 'cancel']);

// Advances, loans, expense claims and leave encashment
Route::get('staff-money/mine', [StaffMoneyController::class, 'mine']);
Route::get('staff-loans', [StaffMoneyController::class, 'loans']);
Route::post('staff-loans', [StaffMoneyController::class, 'requestLoan']);
Route::post('staff-loans/{id}/decide', [StaffMoneyController::class, 'decideLoan']);
Route::post('staff-loans/{id}/disburse', [StaffMoneyController::class, 'disburse']);
Route::post('staff-loans/{id}/skip-month', [StaffMoneyController::class, 'skipMonth']);
Route::post('staff-loans/{id}/repay', [StaffMoneyController::class, 'repay']);
Route::post('staff-loans/{id}/cancel', [StaffMoneyController::class, 'cancelLoan']);
Route::get('staff-loans/{id}/recoveries', [StaffMoneyController::class, 'recoveries']);
Route::get('expense-claims', [StaffMoneyController::class, 'claims']);
Route::post('expense-claims', [StaffMoneyController::class, 'submitClaim']);
Route::post('expense-claims/{id}/decide', [StaffMoneyController::class, 'decideClaim']);
Route::post('expense-claims/{id}/pay', [StaffMoneyController::class, 'payClaim']);
Route::post('expense-claims/{id}/cancel', [StaffMoneyController::class, 'cancelClaim']);
Route::get('expense-claims/{id}/bill', [StaffMoneyController::class, 'bill']);
Route::get('leave-encashments', [StaffMoneyController::class, 'encashments']);
Route::post('leave-encashments', [StaffMoneyController::class, 'encash']);
Route::post('leave-encashments/{id}/cancel', [StaffMoneyController::class, 'cancelEncashment']);

// Exits and full and final settlement
Route::get('separations/mine', [SeparationController::class, 'mine']);
Route::post('separations/resign', [SeparationController::class, 'resign']);
Route::get('separations/report', [SeparationController::class, 'report']);
Route::get('separations', [SeparationController::class, 'index']);
Route::post('separations', [SeparationController::class, 'record']);
Route::post('separations/{id}/withdraw', [SeparationController::class, 'withdraw']);
Route::post('separations/{id}/accept', [SeparationController::class, 'accept']);
Route::post('separations/{id}/reject', [SeparationController::class, 'reject']);
Route::post('separations/{id}/amend', [SeparationController::class, 'amend']);
Route::post('separations/{id}/interview', [SeparationController::class, 'interview']);
Route::post('separations/{id}/relieve', [SeparationController::class, 'relieve']);
Route::get('final-settlements', [FinalSettlementController::class, 'index']);
Route::post('final-settlements/prepare', [FinalSettlementController::class, 'prepare']);
Route::get('final-settlements/{id}', [FinalSettlementController::class, 'show']);
Route::post('final-settlements/{id}/submit', [FinalSettlementController::class, 'submit']);
Route::post('final-settlements/{id}/mark-paid', [FinalSettlementController::class, 'markPaid']);
Route::post('final-settlements/{id}/reopen', [FinalSettlementController::class, 'reopen']);

// Income tax (TDS) on salary
Route::get('tax-declarations/mine', [TaxDeclarationController::class, 'mine']);
Route::put('tax-declarations/mine', [TaxDeclarationController::class, 'save']);
Route::post('tax-declarations/mine/submit', [TaxDeclarationController::class, 'submit']);
Route::post('tax-declaration-items/{id}/proof', [TaxDeclarationController::class, 'uploadProof']);
Route::get('tax-declaration-items/{id}/proof', [TaxDeclarationController::class, 'proof']);
Route::post('tax-declaration-items/{id}/verify', [TaxDeclarationController::class, 'verify']);
Route::get('tax-declarations', [TaxDeclarationController::class, 'index']);
Route::get('tax-declarations/employee/{employeeId}', [TaxDeclarationController::class, 'show']);
Route::put('tax-declarations/employee/{employeeId}', [TaxDeclarationController::class, 'saveFor']);
Route::post('tax-declarations/{id}/lock', [TaxDeclarationController::class, 'lock']);
Route::get('tds/rules', [IncomeTaxController::class, 'rules']);
Route::put('tds/rules', [IncomeTaxController::class, 'saveRules']);
Route::get('tds/challans', [IncomeTaxController::class, 'challans']);
Route::post('tds/challans', [IncomeTaxController::class, 'storeChallan']);
Route::put('tds/challans/{id}', [IncomeTaxController::class, 'updateChallan']);
Route::delete('tds/challans/{id}', [IncomeTaxController::class, 'destroyChallan']);
Route::get('tds/register', [IncomeTaxController::class, 'register']);
Route::get('tds/form16', [IncomeTaxController::class, 'form16']);
Route::get('tds/form24q', [IncomeTaxController::class, 'form24q']);

// Staff app (/hr): the employee's home, approvals inbox, profile and team; HR switches it on per employee.
Route::get('staff-app/home', [StaffAppController::class, 'home']);
Route::get('staff-app/inbox', [StaffAppController::class, 'inbox']);
Route::get('staff-app/profile', [StaffAppController::class, 'profile']);
Route::get('staff-app/team', [StaffAppController::class, 'team']);
Route::get('staff-app-setup', [StaffAppSetupController::class, 'index']);
Route::post('staff-app-setup/{id}/pin', [StaffAppSetupController::class, 'setPin'])->whereNumber('id');
Route::post('staff-app-setup/{id}/disable', [StaffAppSetupController::class, 'disable'])->whereNumber('id');
Route::post('staff-app-setup/{id}/sign-out', [StaffAppSetupController::class, 'signOut'])->whereNumber('id');
