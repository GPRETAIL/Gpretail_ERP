<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrHoliday;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** The store's holiday list, by year. */
class HolidayController extends Controller
{
    public function index(Request $request)
    {
        $year = (int) ($request->query('year') ?: now(config('app.business_timezone'))->year);

        return response()->json(['success' => true, 'data' => HrHoliday::whereYear('date', $year)->orderBy('date')->get()]);
    }

    public function store(Request $request)
    {
        return response()->json(['success' => true, 'message' => 'Holiday added', 'data' => HrHoliday::create($this->validated($request))], 201);
    }

    public function update(Request $request, $id)
    {
        $holiday = HrHoliday::findOrFail($id);
        $holiday->update($this->validated($request, $holiday->id));

        return response()->json(['success' => true, 'message' => 'Holiday updated', 'data' => $holiday]);
    }

    public function destroy($id)
    {
        HrHoliday::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Holiday removed']);
    }

    /** Copies one year's holidays to another, same day and month; dates already there are kept. */
    public function copyYear(Request $request)
    {
        $data = $request->validate(['from' => 'required|integer|min:2000|max:2100', 'to' => 'required|integer|min:2000|max:2100|different:from']);
        $existing = HrHoliday::whereYear('date', $data['to'])->get()->map(fn ($h) => $h->date->format('m-d'))->flip();
        $copied = 0;
        foreach (HrHoliday::whereYear('date', $data['from'])->get() as $holiday) {
            $monthDay = $holiday->date->format('m-d');
            if (($monthDay === '02-29' && ! checkdate(2, 29, $data['to'])) || isset($existing[$monthDay])) {
                continue;
            }
            HrHoliday::create(['date' => "{$data['to']}-{$monthDay}", 'name' => $holiday->name]);
            $copied++;
        }

        return response()->json(['success' => true, 'message' => "{$copied} holiday(s) copied to {$data['to']}"]);
    }

    private function validated(Request $request, ?int $ignore = null): array
    {
        $storeId = $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first.']);
        }

        return $request->validate([
            'date' => ['required', 'date_format:Y-m-d', Rule::unique('hr_holidays', 'date')->where('store_id', $storeId)->ignore($ignore)],
            'name' => 'required|string|max:120',
        ], ['date.unique' => 'There is already a holiday on this date.']);
    }
}
