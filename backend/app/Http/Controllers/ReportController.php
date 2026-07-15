<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Vendor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function getSalesReport(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date',
        ]);

        $from = Carbon::parse($request->date_from)->startOfDay();
        $to = Carbon::parse($request->date_to)->endOfDay();

        $sales = Sale::with(['customer', 'user'])
            ->where('status', 'completed')
            ->whereBetween('sale_date', [$from, $to])
            ->orderBy('sale_date', 'desc')
            ->get();

        $summary = [
            'total_sales' => $sales->sum('payable_amount'),
            'total_discount' => $sales->sum('discount_amount'),
            'total_tax' => $sales->sum('tax_amount'),
            'transactions_count' => $sales->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'summary' => $summary,
                'sales' => $sales
            ]
        ]);
    }

    public function getProfitLossReport(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date',
        ]);

        $from = Carbon::parse($request->date_from)->startOfDay();
        $to = Carbon::parse($request->date_to)->endOfDay();

        // 1. Calculate Revenue
        $revenue = Sale::where('status', 'completed')
            ->whereBetween('sale_date', [$from, $to])
            ->sum('payable_amount');

        // 2. Calculate COGS (Cost of Goods Sold)
        $cogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sale_date', [$from, $to])
            ->select(DB::raw('SUM(products.purchase_price * sale_items.quantity) as cost'))
            ->first()->cost ?? 0;

        // 3. Calculate Expenses
        $expenses = Expense::whereBetween('date', [$request->date_from, $request->date_to])->sum('amount');

        // 4. Gross Profit & Net Profit
        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $expenses;

        return response()->json([
            'status' => 'success',
            'data' => [
                'revenue' => round($revenue, 2),
                'cogs' => round($cogs, 2),
                'expenses' => round($expenses, 2),
                'gross_profit' => round($grossProfit, 2),
                'net_profit' => round($netProfit, 2),
                'margin' => $revenue > 0 ? round(($netProfit / $revenue) * 100, 2) : 0,
            ]
        ]);
    }

    public function getExpenseReport(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date',
        ]);

        $expenses = Expense::with('category')
            ->whereBetween('date', [$request->date_from, $request->date_to])
            ->orderBy('date', 'desc')
            ->get();

        $categoryBreakdown = DB::table('expenses')
            ->join('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->whereBetween('expenses.date', [$request->date_from, $request->date_to])
            ->select('expense_categories.name', DB::raw('SUM(expenses.amount) as total_amount'))
            ->groupBy('expense_categories.id', 'expense_categories.name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_expense' => $expenses->sum('amount'),
                'breakdown' => $categoryBreakdown,
                'expenses' => $expenses
            ]
        ]);
    }

    public function getInventoryReport()
    {
        $products = Product::with(['category', 'brand'])->get();

        $totalItems = $products->sum('quantity');
        $totalCostValue = $products->sum(function($p) {
            return $p->quantity * $p->purchase_price;
        });
        $totalRetailValue = $products->sum(function($p) {
            return $p->quantity * $p->selling_price;
        });
        $potentialProfit = $totalRetailValue - $totalCostValue;

        return response()->json([
            'status' => 'success',
            'data' => [
                'summary' => [
                    'total_items' => $totalItems,
                    'total_cost_value' => round($totalCostValue, 2),
                    'total_retail_value' => round($totalRetailValue, 2),
                    'potential_profit' => round($potentialProfit, 2),
                ],
                'products' => $products
            ]
        ]);
    }

    public function getVendorReport()
    {
        $vendors = Vendor::all();
        $report = [];

        foreach ($vendors as $v) {
            $purchaseOrders = DB::table('purchase_orders')
                ->where('vendor_id', $v->id)
                ->select(
                    DB::raw('COUNT(*) as total_orders'),
                    DB::raw('SUM(total_amount) as total_amount'),
                    DB::raw('SUM(paid_amount) as total_paid')
                )
                ->first();

            $report[] = [
                'id' => $v->id,
                'name' => $v->name,
                'contact_person' => $v->contact_person,
                'total_orders' => $purchaseOrders->total_orders ?? 0,
                'total_amount' => round($purchaseOrders->total_amount ?? 0, 2),
                'total_paid' => round($purchaseOrders->total_paid ?? 0, 2),
                'balance_due' => round(($purchaseOrders->total_amount ?? 0) - ($purchaseOrders->total_paid ?? 0), 2),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $report
        ]);
    }

    public function getCashierReport(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date',
        ]);

        $from = Carbon::parse($request->date_from)->startOfDay();
        $to = Carbon::parse($request->date_to)->endOfDay();

        $cashiers = User::whereIn('role', ['cashier', 'manager'])->get();
        $report = [];

        foreach ($cashiers as $c) {
            $stats = DB::table('sales')
                ->where('user_id', $c->id)
                ->where('status', 'completed')
                ->whereBetween('sale_date', [$from, $to])
                ->select(
                    DB::raw('COUNT(*) as transactions'),
                    DB::raw('SUM(payable_amount) as total_sales'),
                    DB::raw('AVG(payable_amount) as avg_trans_value')
                )
                ->first();

            $report[] = [
                'id' => $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'transactions' => $stats->transactions ?? 0,
                'total_sales' => round($stats->total_sales ?? 0, 2),
                'avg_transaction_value' => round($stats->avg_trans_value ?? 0, 2),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $report
        ]);
    }
}
