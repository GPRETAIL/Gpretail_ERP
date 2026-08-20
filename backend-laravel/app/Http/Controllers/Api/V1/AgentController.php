<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AgentController extends Controller
{
    public function index(Request $request)
    {
        $query = Agent::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
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
            'name'            => 'required|string|max:255',
            'code'            => 'nullable|string|max:50|unique:agents,code',
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'commission_rate' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $code = $request->input('code') ?: 'AGT_' . strtoupper(substr(uniqid(), -6));

        $agent = Agent::create([
            'name'            => $request->input('name'),
            'code'            => $code,
            'email'           => $request->input('email'),
            'phone'           => $request->input('phone'),
            'commission_rate' => $request->input('commission_rate', 0),
            'is_active'       => $request->boolean('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agent created successfully',
            'data'    => $agent,
        ], 201);
    }

    public function show($id)
    {
        $agent = Agent::find($id);

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $agent,
        ]);
    }

    public function update(Request $request, $id)
    {
        $agent = Agent::find($id);

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name'            => 'sometimes|required|string|max:255',
            'code'            => 'sometimes|required|string|max:50|unique:agents,code,' . $id,
            'email'           => 'nullable|email|max:255',
            'phone'           => 'nullable|string|max:50',
            'commission_rate' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $agent->update($request->only([
            'name', 'code', 'email', 'phone', 'commission_rate', 'is_active'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Agent updated successfully',
            'data'    => $agent,
        ]);
    }

    public function destroy($id)
    {
        $agent = Agent::find($id);

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent not found',
            ], 404);
        }

        $agent->delete();

        return response()->json([
            'success' => true,
            'message' => 'Agent deleted successfully',
        ]);
    }
}
