<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Controllers\Controller;
use App\Models\OpeningBill;
use App\Services\Accounting\OpeningBalances;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Finance > Opening Balance for the selected store: every ledger's opening in one grid, and the bills customers and
 * suppliers owed when the books started (collected or paid later like any other bill).
 */
class OpeningBalanceController extends Controller
{
    public function __construct(private OpeningBalances $openings) {}

    public function ledgers(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->openings->ledgers($this->store($request))]);
    }

    public function saveLedgers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rows' => 'required|array|min:1|max:5000',
            'rows.*.id' => 'required|integer',
            'rows.*.opening_balance' => 'required|numeric|between:-9999999999999,9999999999999',
        ]);

        return response()->json(['success' => true, 'message' => 'Opening balances saved.', 'data' => $this->openings->saveLedgers($this->store($request), $data['rows'])]);
    }

    public function bills(Request $request): JsonResponse
    {
        $request->validate(['party_type' => ['required', Rule::in(OpeningBill::PARTY_TYPES)]]);

        return response()->json(['success' => true, 'data' => $this->openings->bills($this->store($request), $request->input('party_type'))]);
    }

    public function storeBill(Request $request): JsonResponse
    {
        $bill = $this->openings->saveBill($this->store($request), $this->validBill($request), $request->user()?->id);

        return response()->json(['success' => true, 'message' => 'Opening bill added.', 'data' => $this->openings->present($bill)], 201);
    }

    public function updateBill(Request $request, int $id): JsonResponse
    {
        $storeId = $this->store($request);
        $bill = OpeningBill::where('store_id', $storeId)->findOrFail($id);
        $bill = $this->openings->saveBill($storeId, $this->validBill($request), $request->user()?->id, $bill);

        return response()->json(['success' => true, 'message' => 'Opening bill updated.', 'data' => $this->openings->present($bill)]);
    }

    public function destroyBill(Request $request, int $id): JsonResponse
    {
        $storeId = $this->store($request);
        $this->openings->deleteBill($storeId, OpeningBill::where('store_id', $storeId)->findOrFail($id));

        return response()->json(['success' => true, 'message' => 'Opening bill deleted.']);
    }

    /** Excel rows, posted as a raw array (UploadImportButton) or as {rows: [...]}. */
    public function importBills(Request $request): JsonResponse
    {
        $rows = $request->input('rows', array_is_list($request->all()) ? $request->all() : []);
        if (! is_array($rows) || $rows === [] || count($rows) > 5000) {
            throw ValidationException::withMessages(['rows' => 'The file has no rows (or more than 5000).']);
        }
        $result = $this->openings->import($this->store($request), array_values(array_filter($rows, 'is_array')), $request->user()?->id);

        return response()->json(['success' => true, 'message' => "{$result['added']} opening bill(s) added".($result['skipped'] ? ', '.count($result['skipped']).' skipped.' : '.'), 'created' => $result['added'], 'data' => $result]);
    }

    private function validBill(Request $request): array
    {
        return $request->validate([
            'party_type' => ['required', Rule::in(OpeningBill::PARTY_TYPES)],
            'party_id' => 'required|integer',
            'bill_no' => 'required|string|max:60',
            'bill_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:bill_date',
            'amount' => 'required|numeric|min:0.01|max:9999999999999',
            'notes' => 'nullable|string|max:500',
        ]);
    }

    private function store(Request $request): int
    {
        $storeId = (int) $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first; each store keeps its own books.']);
        }

        return $storeId;
    }
}
