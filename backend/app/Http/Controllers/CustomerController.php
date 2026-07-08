<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $customers
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:customers,email',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $customer = Customer::create(array_merge($request->all(), ['loyalty_points' => 0]));

        return response()->json(['status' => 'success', 'message' => 'Customer created successfully', 'data' => $customer], 201);
    }

    public function show($id)
    {
        $customer = Customer::with(['sales' => function($q) {
            $q->orderBy('sale_date', 'desc');
        }])->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $customer]);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "nullable|email|unique:customers,email,{$id}",
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $customer->update($request->all());

        return response()->json(['status' => 'success', 'message' => 'Customer updated successfully', 'data' => $customer]);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        
        // Prevent deleting Walk-in customer (default ID 1)
        if ($customer->id === 1) {
            return response()->json(['status' => 'error', 'message' => 'Cannot delete default Walk-in Customer.'], 422);
        }

        $customer->delete();

        return response()->json(['status' => 'success', 'message' => 'Customer deleted successfully']);
    }
}
