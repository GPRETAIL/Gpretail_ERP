<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Tax;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TaxController extends Controller
{
    public function index(Request $request)
    {
        $query = Tax::with('slabs');

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%");
            });
        }

        $formatTax = function ($t) {
            return [
                'id'             => $t->id,
                'code'           => $t->code,
                'tax_code'       => $t->code,
                'name'           => $t->name,
                'rate'           => (float) $t->rate,
                'tax_percentage' => (float) $t->rate,
                'type'           => $t->type ?: 'GST',
                'tax_type'       => $t->type ?: 'GST',
                'cgst'           => (float) ($t->cgst_rate ?: ($t->rate / 2)),
                'sgst'           => (float) ($t->sgst_rate ?: ($t->rate / 2)),
                'igst'           => (float) ($t->igst_rate ?: $t->rate),
                'cgst_rate'      => (float) ($t->cgst_rate ?: ($t->rate / 2)),
                'sgst_rate'      => (float) ($t->sgst_rate ?: ($t->rate / 2)),
                'igst_rate'      => (float) ($t->igst_rate ?: $t->rate),
                'is_sales_tax'   => true,
                'is_purchase_tax'=> true,
                'is_disabled'    => !$t->is_active,
                'is_active'      => (bool) $t->is_active,
                'extra_fields'   => [
                    'cgst' => (float) ($t->cgst_rate ?: ($t->rate / 2)),
                    'sgst' => (float) ($t->sgst_rate ?: ($t->rate / 2)),
                ],
                'created_at'     => $t->created_at,
                'updated_at'     => $t->updated_at,
            ];
        };

        if ($request->boolean('all')) {
            $items = $query->orderBy('name')->limit(2000)->get()->map($formatTax);
            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        $limit     = max(1, $request->integer('limit', 20));
        $page      = max(1, $request->integer('page', 1));
        $paginated = $query->orderBy('name')->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => collect($paginated->items())->map($formatTax),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function show($id)
    {
        $tax = Tax::with('slabs')
            ->where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $rate = (float) $tax->rate;
        $data = [
            'id'             => $tax->id,
            'code'           => $tax->code,
            'tax_code'       => $tax->code,
            'name'           => $tax->name,
            'rate'           => $rate,
            'tax_percentage' => $rate,
            'type'           => $tax->type ?: 'GST',
            'tax_type'       => $tax->type ?: 'GST',
            'cgst'           => (float) ($tax->cgst_rate ?: ($rate / 2)),
            'sgst'           => (float) ($tax->sgst_rate ?: ($rate / 2)),
            'igst'           => (float) ($tax->igst_rate ?: $rate),
            'cgst_rate'      => (float) ($tax->cgst_rate ?: ($rate / 2)),
            'sgst_rate'      => (float) ($tax->sgst_rate ?: ($rate / 2)),
            'igst_rate'      => (float) ($tax->igst_rate ?: $rate),
            'is_sales_tax'   => true,
            'is_purchase_tax'=> true,
            'is_disabled'    => !$tax->is_active,
            'is_active'      => (bool) $tax->is_active,
            'extra_fields'   => [
                'cgst' => (float) ($tax->cgst_rate ?: ($rate / 2)),
                'sgst' => (float) ($tax->sgst_rate ?: ($rate / 2)),
            ],
        ];

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function store(Request $request)
    {
        $code = $request->input('code') ?: $request->input('taxCode') ?: ('TAX_' . strtoupper(substr(uniqid(), -6)));
        $name = $request->input('name');
        $rate = $request->input('rate') ?? $request->input('taxPercentage') ?? 0;
        $type = $request->input('type') ?: $request->input('taxCharges') ?: $request->input('tax_type') ?: 'GST';
        $isActive = $request->has('is_disabled') ? !$request->boolean('is_disabled') : ($request->has('isDisabled') ? !$request->boolean('isDisabled') : $request->boolean('is_active', true));

        $cgst = (float) ($request->input('cgst_rate') ?? $request->input('cgst') ?? ($rate / 2));
        $sgst = (float) ($request->input('sgst_rate') ?? $request->input('sgst') ?? ($rate / 2));
        $igst = (float) ($request->input('igst_rate') ?? $request->input('igst') ?? $rate);

        $tax = Tax::create([
            'code'      => $code,
            'name'      => $name,
            'rate'      => $rate,
            'type'      => $type,
            'cgst_rate' => $cgst,
            'sgst_rate' => $sgst,
            'igst_rate' => $igst,
            'is_active' => $isActive,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tax created successfully',
            'data'    => $tax,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $tax = Tax::where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $data = [];
        if ($request->filled('name')) $data['name'] = $request->input('name');
        if ($request->filled('code') || $request->filled('taxCode')) $data['code'] = $request->input('code') ?: $request->input('taxCode');
        if ($request->has('rate') || $request->has('taxPercentage')) $data['rate'] = $request->input('rate') ?? $request->input('taxPercentage');
        if ($request->has('type') || $request->has('taxCharges') || $request->has('tax_type')) $data['type'] = $request->input('type') ?: $request->input('taxCharges') ?: $request->input('tax_type');
        
        if (isset($data['rate'])) {
            $r = (float) $data['rate'];
            $data['cgst_rate'] = (float) ($request->input('cgst_rate') ?? $request->input('cgst') ?? ($r / 2));
            $data['sgst_rate'] = (float) ($request->input('sgst_rate') ?? $request->input('sgst') ?? ($r / 2));
            $data['igst_rate'] = (float) ($request->input('igst_rate') ?? $request->input('igst') ?? $r);
        }

        if ($request->has('is_disabled') || $request->has('isDisabled')) {
            $disabled = $request->has('is_disabled') ? $request->boolean('is_disabled') : $request->boolean('isDisabled');
            $data['is_active'] = !$disabled;
        } elseif ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $tax->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Tax updated successfully',
            'data'    => $tax,
        ]);
    }

    public function destroy($id)
    {
        $tax = Tax::where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $tax->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tax deleted successfully',
        ]);
    }
}
