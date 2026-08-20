<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Stock;
use Illuminate\Http\Request;

class ItemLocatorController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search') ?? $request->input('q') ?? '';
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $query = Stock::with(['product.brand', 'product.category', 'store'])
            ->where('store_id', $storeId)
            ->whereHas('product', function ($q) use ($search) {
                if ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                }
            });

        $mapRow = fn ($s) => [
            'id'            => $s->id,
            'product_id'    => $s->product_id,
            'product_name'  => $s->product?->name,
            'code'          => $s->product?->code,
            'barcode'       => $s->product?->barcode,
            'brand_name'    => $s->product?->brand?->name ?? '-',
            'category_name' => $s->product?->category?->name ?? '-',
            'quantity'      => $s->quantity,
            'location_bin'  => $s->location_bin ?? 'Rack A-1',
            'store_name'    => $s->store?->name ?? '-',
            'selling_price' => $s->product?->selling_price,
            'mrp'           => $s->product?->mrp,
        ];

        // Previously always unbounded, no pagination at all.
        if ($request->boolean('all')) {
            $data = $query->limit(2000)->get()->map($mapRow);
            return response()->json([
                'success' => true,
                'data'    => $data,
                'total'   => $data->count(),
            ]);
        }

        $limit = $request->integer('limit', 50);
        $paginated = $query->paginate($limit);
        $data = collect($paginated->items())->map($mapRow);

        return response()->json([
            'success'    => true,
            'data'       => $data,
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }
}
