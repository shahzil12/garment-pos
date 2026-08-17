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
        // Allow listing cashiers and managers
        $employees = User::whereIn('role', ['cashier', 'manager'])->orderBy('name', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $employees]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|in:cashier,manager',
        ]);

        $employee = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'cashier',
            'is_active' => true,
        ]);

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Staff Account Created',
            'description' => "Created " . ucfirst($employee->role) . " account for {$employee->name} ({$employee->email})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Staff account created successfully', 'data' => $employee], 201);
    }

    public function update(Request $request, $id)
    {
        $employee = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$id}",
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|in:cashier,manager',
        ]);

        $employee->name = $request->name;
        $employee->email = $request->email;
        if ($request->filled('role')) {
            $employee->role = $request->role;
        }

        if ($request->filled('password')) {
            $employee->password = Hash::make($request->password);
        }

        $employee->save();

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Staff Account Updated',
            'description' => "Updated " . ucfirst($employee->role) . " account ID {$id} ({$employee->name})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Staff account updated successfully', 'data' => $employee]);
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
            'action' => "Staff Status Toggled",
            'description' => "{$status} " . ucfirst($employee->role) . " account ID {$id} ({$employee->name})",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => "Staff account {$status} successfully", 'data' => $employee]);
    }
}
