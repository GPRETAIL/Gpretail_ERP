<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transport;
use App\Models\TransportEntry;
use App\Services\DocumentNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TransportEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = TransportEntry::with(['transport', 'issues', 'receipts']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('lr_no', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhereHas('transport', function ($tq) use ($search) {
                        $tq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('created_at', 'desc')->limit(2000)->get();

            return response()->json([
                'success' => true,
                'data' => $items,
                'total' => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'page' => $paginated->currentPage(),
            'limit' => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lr_no' => 'nullable|string|max:100|unique:transport_entries,lr_no',
            'lr_date' => 'nullable|date',
            'transport_id' => 'nullable|exists:transports,id',
            'packages_count' => 'nullable|integer',
            'weight_kg' => 'nullable|numeric',
            'freight_charges' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $transportId = $request->input('transport_id');
        if (! $transportId) {
            $defaultTransport = Transport::first();
            $transportId = $defaultTransport ? $defaultTransport->id : Transport::create([
                'name' => 'Default Transport',
                'code' => 'TRP_DEF',
            ])->id;
        }

        // transport_entries has no store_id column (a pre-existing schema gap, unrelated
        // to this fix) -- the scope header is used purely as the counter's key so LR
        // numbers stay collision-safe between a store's local install and cloud.
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $lrNo = $request->input('lr_no') ?: DocumentNumberService::resolve($request, $storeId, 'LR');

        $entry = TransportEntry::create([
            'transport_id' => $transportId,
            'lr_no' => $lrNo,
            'lr_date' => $request->input('lr_date') ?: now()->toDateString(),
            'source' => $request->input('source', 'Supplier Hub'),
            'destination' => $request->input('destination', 'Main Warehouse'),
            'packages_count' => $request->input('packages_count', 1),
            'weight_kg' => $request->input('weight_kg', 0),
            'freight_charges' => $request->input('freight_charges', 0),
            'status' => $request->input('status', 'IN_TRANSIT'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transport entry created successfully',
            'data' => $entry->load('transport'),
        ], 201);
    }

    public function show($id)
    {
        $entry = TransportEntry::with(['transport', 'issues', 'receipts'])->find($id);

        if (! $entry) {
            return response()->json([
                'success' => false,
                'message' => 'Transport entry not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $entry,
        ]);
    }

    public function update(Request $request, $id)
    {
        $entry = TransportEntry::find($id);

        if (! $entry) {
            return response()->json([
                'success' => false,
                'message' => 'Transport entry not found',
            ], 404);
        }

        $entry->update($request->only([
            'transport_id', 'lr_no', 'lr_date', 'source', 'destination',
            'packages_count', 'weight_kg', 'freight_charges', 'status',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Transport entry updated successfully',
            'data' => $entry->load('transport'),
        ]);
    }

    public function destroy($id)
    {
        $entry = TransportEntry::find($id);

        if (! $entry) {
            return response()->json([
                'success' => false,
                'message' => 'Transport entry not found',
            ], 404);
        }

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Transport entry deleted successfully',
        ]);
    }

    public function nextLrNumber(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $nextNo = DocumentNumberService::peek($storeId, 'LR');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_lr_no' => $nextNo,
        ]);
    }

    public function duplicates(Request $request)
    {
        $lrNo = $request->input('lr_no');
        $exists = TransportEntry::where('lr_no', $lrNo)->exists();

        return response()->json([
            'success' => true,
            'data' => ['has_duplicate' => $exists],
        ]);
    }

    public function storeAttachment(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Attachment uploaded successfully',
            'data' => ['id' => rand(100, 999), 'url' => ''],
        ]);
    }

    public function destroyAttachment($attId)
    {
        return response()->json([
            'success' => true,
            'message' => 'Attachment deleted successfully',
        ]);
    }

    public function nextIssueNumber(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $nextNo = DocumentNumberService::peek($storeId, 'ISSUE');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_issue_no' => $nextNo,
        ]);
    }

    public function nextReceiptNumber(Request $request)
    {
        $storeId = (int) $request->header('X-Company-Scope-Id', 1);
        $nextNo = DocumentNumberService::peek($storeId, 'RCPT');

        return response()->json([
            'success' => true,
            'data' => $nextNo,
            'next_receipt_no' => $nextNo,
        ]);
    }
}
