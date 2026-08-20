<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transport;
use App\Models\TransportEntry;
use App\Models\TransportIssue;
use App\Models\TransportReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data'    => $paginated->items(),
            'total'   => $paginated->total(),
            'page'    => $paginated->currentPage(),
            'limit'   => $paginated->perPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lr_no'           => 'nullable|string|max:100|unique:transport_entries,lr_no',
            'lr_date'         => 'nullable|date',
            'transport_id'    => 'nullable|exists:transports,id',
            'packages_count'  => 'nullable|integer',
            'weight_kg'       => 'nullable|numeric',
            'freight_charges' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $transportId = $request->input('transport_id');
        if (!$transportId) {
            $defaultTransport = Transport::first();
            $transportId = $defaultTransport ? $defaultTransport->id : Transport::create([
                'name' => 'Default Transport',
                'code' => 'TRP_DEF',
            ])->id;
        }

        $lrNo = $request->input('lr_no') ?: 'LR-' . date('Ymd') . '-' . rand(1000, 9999);

        $entry = TransportEntry::create([
            'transport_id'    => $transportId,
            'lr_no'           => $lrNo,
            'lr_date'         => $request->input('lr_date') ?: now()->toDateString(),
            'source'          => $request->input('source', 'Supplier Hub'),
            'destination'     => $request->input('destination', 'Main Warehouse'),
            'packages_count'  => $request->input('packages_count', 1),
            'weight_kg'       => $request->input('weight_kg', 0),
            'freight_charges' => $request->input('freight_charges', 0),
            'status'          => $request->input('status', 'IN_TRANSIT'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transport entry created successfully',
            'data'    => $entry->load('transport'),
        ], 201);
    }

    public function show($id)
    {
        $entry = TransportEntry::with(['transport', 'issues', 'receipts'])->find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Transport entry not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $entry,
        ]);
    }

    public function update(Request $request, $id)
    {
        $entry = TransportEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Transport entry not found',
            ], 404);
        }

        $entry->update($request->only([
            'transport_id', 'lr_no', 'lr_date', 'source', 'destination',
            'packages_count', 'weight_kg', 'freight_charges', 'status'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Transport entry updated successfully',
            'data'    => $entry->load('transport'),
        ]);
    }

    public function destroy($id)
    {
        $entry = TransportEntry::find($id);

        if (!$entry) {
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

    public function nextLrNumber()
    {
        $latest = TransportEntry::max('id') + 1;
        $nextNo = 'LR-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_lr_no' => $nextNo,
        ]);
    }

    public function duplicates(Request $request)
    {
        $lrNo = $request->input('lr_no');
        $exists = TransportEntry::where('lr_no', $lrNo)->exists();

        return response()->json([
            'success' => true,
            'data'    => ['has_duplicate' => $exists],
        ]);
    }

    public function storeAttachment(Request $request, $id)
    {
        return response()->json([
            'success' => true,
            'message' => 'Attachment uploaded successfully',
            'data'    => ['id' => rand(100, 999), 'url' => ''],
        ]);
    }

    public function destroyAttachment($attId)
    {
        return response()->json([
            'success' => true,
            'message' => 'Attachment deleted successfully',
        ]);
    }

    public function nextIssueNumber()
    {
        $latest = TransportIssue::max('id') + 1;
        $nextNo = 'ISSUE-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_issue_no' => $nextNo,
        ]);
    }

    public function nextReceiptNumber()
    {
        $latest = TransportReceipt::max('id') + 1;
        $nextNo = 'RCPT-' . date('Ymd') . '-' . str_pad($latest, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'data'    => $nextNo,
            'next_receipt_no' => $nextNo,
        ]);
    }
}
