<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Controllers\Controller;
use App\Services\Sales\BillReprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sales > Bill Reprint: find any sales document and reprint it. The screen fetches the document itself from its own
 * endpoint (pos-sales/{id}, dealer-invoices/{id}, ...), prints it in the store's format marked DUPLICATE, then logs
 * the reprint here; the log enforces the reason and approval rules.
 */
class BillReprintController extends Controller
{
    public function __construct(private BillReprint $reprints) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:100', 'types' => 'nullable|array', 'types.*' => 'string|in:'.implode(',', BillReprint::TYPES),
            'from' => 'nullable|date', 'to' => 'nullable|date', 'customer_id' => 'nullable|integer',
        ]);
        $rows = $this->reprints->search($data);
        $user = $request->user();

        return response()->json(['success' => true, 'data' => array_map(fn ($row) => [...$row, ...$this->reprints->rules($user, $row)], $rows), 'total' => count($rows)]);
    }

    /** One document's row, reprint count and what reprinting it needs (reason, approval). */
    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $this->type($type);
        $row = $this->reprints->find($type, $id);
        abort_unless($row, 404, 'Document not found.');

        return response()->json(['success' => true, 'data' => [...$row, ...$this->reprints->rules($request->user(), $row)]]);
    }

    public function history(string $type, int $id): JsonResponse
    {
        $this->type($type);

        return response()->json(['success' => true, 'data' => $this->reprints->history($type, $id)]);
    }

    public function log(Request $request, string $type, int $id): JsonResponse
    {
        $this->type($type);
        $data = $request->validate([
            'copy_label' => 'nullable|string|max:60', 'reason' => 'nullable|string|max:255',
            'channel' => 'nullable|in:print,share', 'approvalToken' => 'nullable|string|max:200',
        ]);

        return response()->json(['success' => true, 'data' => $this->reprints->log($request->user(), $type, $id, $data)]);
    }

    private function type(string $type): void
    {
        abort_unless(in_array($type, BillReprint::TYPES, true), 404, 'Unknown document type.');
    }
}
