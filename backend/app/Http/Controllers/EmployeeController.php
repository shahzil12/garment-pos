<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        // Allow listing cashiers (and admins if logged in user is admin, but for this cashier management module, we focus on cashier)
        $employees = User::where('role', 'cashier')->orderBy('name', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $employees]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $employee = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'cashier',
            'is_active' => true,
        ]);

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Cashier Created',
            'description' => "Created cashier account for {$employee->name} ({$employee->email})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Cashier account created successfully', 'data' => $employee], 201);
    }

    public function update(Request $request, $id)
    {
        $employee = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$id}",
            'password' => 'nullable|string|min:6',
        ]);

        $employee->name = $request->name;
        $employee->email = $request->email;

        if ($request->filled('password')) {
            $employee->password = Hash::make($request->password);
        }

        $employee->save();

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Cashier Updated',
            'description' => "Updated cashier account ID {$id} ({$employee->name})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Cashier account updated successfully', 'data' => $employee]);
    }

    public function toggleStatus(Request $request, $id)
    {
        $employee = User::findOrFail($id);
        $employee->is_active = !$employee->is_active;
        $employee->save();

        $status = $employee->is_active ? 'activated' : 'deactivated';

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => "Cashier Status Toggled",
            'description' => "{$status} cashier account ID {$id} ({$employee->name})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => "Cashier account {$status} successfully", 'data' => $employee]);
    }
}
