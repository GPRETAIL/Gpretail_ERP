<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Transport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TransportController extends Controller
{
    public function index(Request $request)
    {
        $query = Transport::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('vehicle_no', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->input('limit') == 500 || $request->input('limit') == 1000) {
            $items = $query->orderBy('name')->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $items,
                'total'   => $items->count(),
            ]);
        }

        // Same order as the all=true branch above - it was 'created_at desc' here, giving a
        // different row order depending on which branch a given request happened to take.
        $limit = $request->integer('limit', 15);
        $paginated = $query->orderBy('name')->paginate($limit);

        return response()->json([
            'success'    => true,
            'data'       => $paginated->items(),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'           => 'required|string|max:255',
            'code'           => 'nullable|string|max:50|unique:transports,code',
            'phone'          => 'nullable|string|max:50',
            'vehicle_no'     => 'nullable|string|max:50',
            'contact_person' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'TRP_' . strtoupper(substr(uniqid(), -6));

        $transport = Transport::create([
            'name'           => $request->input('name'),
            'code'           => $code,
            'phone'          => $request->input('phone'),
            'vehicle_no'     => $request->input('vehicle_no'),
            'contact_person' => $request->input('contact_person'),
            'is_active'      => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transport created successfully',
            'data'    => $transport,
        ], 201);
    }

    public function show($id)
    {
        $transport = Transport::find($id);

        if (!$transport) {
            return response()->json([
                'success' => false,
                'message' => 'Transport not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $transport,
        ]);
    }

    public function update(Request $request, $id)
    {
        $transport = Transport::find($id);

        if (!$transport) {
            return response()->json([
                'success' => false,
                'message' => 'Transport not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name'           => 'sometimes|required|string|max:255',
            'code'           => 'sometimes|required|string|max:50|unique:transports,code,' . $id,
            'phone'          => 'nullable|string|max:50',
            'vehicle_no'     => 'nullable|string|max:50',
            'contact_person' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $transport->update($request->only([
            'name', 'code', 'phone', 'vehicle_no', 'contact_person', 'is_active'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Transport updated successfully',
            'data'    => $transport,
        ]);
    }

    public function destroy($id)
    {
        $transport = Transport::find($id);

        if (!$transport) {
            return response()->json([
                'success' => false,
                'message' => 'Transport not found',
            ], 404);
        }

        $transport->delete();

        return response()->json([
            'success' => true,
            'message' => 'Transport deleted successfully',
        ]);
    }
}
