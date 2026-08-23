<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    public function today(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);
        $today = now()->toDateString();
        $nowTime = now()->format('H:i:s');

        $store = ($storeId && $storeId !== 'all') ? Store::find($storeId) : null;
        $settings = $store?->attendance_settings ?? [];
        $shiftStart = $settings['shift_start'] ?? '09:30';
        $lateCutoff = $settings['late_cutoff'] ?? '10:00';

        $employees = Employee::where('is_active', true)
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId))
            ->with(['department'])
            ->orderBy('name')
            ->get();

        $todaysRows = Attendance::whereDate('date', $today)
            ->whereIn('employee_id', $employees->pluck('id'))
            ->get()
            ->keyBy('employee_id');

        $rows = $employees->map(function ($employee) use ($todaysRows, $nowTime, $lateCutoff) {
            $row = $todaysRows->get($employee->id);

            if ($row) {
                $status = $row->status;
                $checkIn = $row->check_in;
                $checkOut = $row->check_out;
            } else {
                $status = ($nowTime > $lateCutoff) ? 'ABSENT' : 'NOT_MARKED';
                $checkIn = null;
                $checkOut = null;
            }

            return [
                'employee_id'   => $employee->id,
                'name'          => $employee->name,
                'code'          => $employee->code,
                'department'    => $employee->department?->name,
                'status'        => $status,
                'check_in'      => $checkIn,
                'check_out'     => $checkOut,
            ];
        })->values();

        $summary = [
            'total'   => $rows->count(),
            'present' => $rows->where('status', 'PRESENT')->count(),
            'absent'  => $rows->where('status', 'ABSENT')->count(),
            'leave'   => $rows->where('status', 'LEAVE')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'date'     => $today,
                'settings' => [
                    'shift_start' => $shiftStart,
                    'late_cutoff' => $lateCutoff,
                ],
                'summary'  => $summary,
                'rows'     => $rows,
            ],
        ]);
    }

    public function checkIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $today = now()->toDateString();

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $request->input('employee_id'), 'date' => $today],
            ['check_in' => now()->format('H:i:s'), 'status' => 'PRESENT']
        );

        return response()->json([
            'success' => true,
            'message' => 'Checked in',
            'data'    => $attendance,
        ]);
    }

    public function checkOut(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $today = now()->toDateString();

        $attendance = Attendance::where('employee_id', $request->input('employee_id'))
            ->whereDate('date', $today)
            ->first();

        if (!$attendance || !$attendance->check_in) {
            return response()->json(['success' => false, 'message' => 'Employee has not checked in today'], 422);
        }

        $attendance->update(['check_out' => now()->format('H:i:s')]);

        return response()->json([
            'success' => true,
            'message' => 'Checked out',
            'data'    => $attendance,
        ]);
    }

    public function markLeave(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $today = now()->toDateString();

        $attendance = Attendance::updateOrCreate(
            ['employee_id' => $request->input('employee_id'), 'date' => $today],
            ['status' => 'LEAVE']
        );

        return response()->json([
            'success' => true,
            'message' => 'Marked on leave',
            'data'    => $attendance,
        ]);
    }

    public function settings(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id');

        if ($request->isMethod('post') || $request->isMethod('put')) {
            if (!$storeId || $storeId === 'all') {
                return response()->json(['success' => false, 'message' => 'A specific store must be selected'], 422);
            }

            $store = Store::find($storeId);
            if (!$store) {
                return response()->json(['success' => false, 'message' => 'Store not found'], 404);
            }

            $store->update([
                'attendance_settings' => $request->only(['shift_start', 'late_cutoff']),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Attendance settings updated',
            ]);
        }

        $store = ($storeId && $storeId !== 'all') ? Store::find($storeId) : null;
        $settings = $store?->attendance_settings ?? [];

        return response()->json([
            'success' => true,
            'data'    => [
                'shift_start' => $settings['shift_start'] ?? '09:30',
                'late_cutoff' => $settings['late_cutoff'] ?? '10:00',
            ],
        ]);
    }
}
