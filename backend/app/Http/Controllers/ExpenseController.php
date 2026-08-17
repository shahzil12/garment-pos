<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    // ==========================================
    // Expense Categories
    // ==========================================
    public function indexCategories()
    {
        $categories = ExpenseCategory::withCount('expenses')->get();
        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    public function storeCategory(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:expense_categories,name']);
        $category = ExpenseCategory::create($request->all());
        return response()->json(['status' => 'success', 'message' => 'Expense category created successfully', 'data' => $category], 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = ExpenseCategory::findOrFail($id);
        $request->validate(['name' => "required|string|max:255|unique:expense_categories,name,{$id}"]);
        $category->update($request->all());
        return response()->json(['status' => 'success', 'message' => 'Expense category updated successfully', 'data' => $category]);
    }

    public function destroyCategory($id)
    {
        $category = ExpenseCategory::findOrFail($id);
        $category->delete();
        return response()->json(['status' => 'success', 'message' => 'Expense category deleted successfully']);
    }

    // ==========================================
    // Expenses CRUD
    // ==========================================
    public function indexExpenses(Request $request)
    {
        $query = Expense::with('category');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('description', 'like', "%{$search}%");
        }

        if ($request->filled('expense_category_id')) {
            $query->where('expense_category_id', $request->expense_category_id);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('date', [$request->date_from, $request->date_to]);
        }

        $expenses = $query->orderBy('date', 'desc')->paginate($request->input('per_page', 10));

        return response()->json(['status' => 'success', 'data' => $expenses]);
    }

    public function storeExpense(Request $request)
    {
        $request->validate([
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string|max:255',
        ]);

        $expense = Expense::create($request->all());

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Expense Added',
            'description' => "Recorded expense for {$expense->amount} on {$expense->date}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Expense recorded successfully', 'data' => $expense], 201);
    }

    public function updateExpense(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);

        $request->validate([
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string|max:255',
        ]);

        $expense->update($request->all());

        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Expense Updated',
            'description' => "Updated expense ID {$id} to {$expense->amount}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Expense updated successfully', 'data' => $expense]);
    }

    public function destroyExpense(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        
        // Audit Trail
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'Expense Deleted',
            'description' => "Deleted expense of amount {$expense->amount} dated {$expense->date}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $expense->delete();

        return response()->json(['status' => 'success', 'message' => 'Expense deleted successfully']);
    }
}
