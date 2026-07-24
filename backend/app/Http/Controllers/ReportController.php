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

        $sales = Sale::with(['customer', 'user', 'items.product'])
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

        // 1. Calculate Revenue (excluding tax)
        $revenue = Sale::where('status', 'completed')
            ->whereBetween('sale_date', [$from, $to])
            ->sum(DB::raw('payable_amount - tax_amount'));

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

    /**
     * Get Item Analytics Report filtered by date range or specific date.
     * Computes Total Sales & Revenue, Peak/Top Performer, Lowest Performer, and Detailed Items List.
     */
    public function getAnalyticsReport(Request $request)
    {
        $request->validate([
            'date' => 'nullable|date',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        if ($request->filled('date')) {
            $from = Carbon::parse($request->date)->startOfDay();
            $to = Carbon::parse($request->date)->endOfDay();
        } else {
            $from = Carbon::parse($request->input('date_from', Carbon::today()))->startOfDay();
            $to = Carbon::parse($request->input('date_to', Carbon::today()))->endOfDay();
        }

        // Query item sales aggregated for completed sales in the date range
        $rawItems = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.sale_date', [$from, $to])
            ->select(
                'products.id as product_id',
                'products.sku',
                'products.name as product_name',
                'categories.name as category_name',
                'products.selling_price as unit_price',
                'products.quantity as current_stock',
                DB::raw('SUM(sale_items.quantity) as total_qty_sold'),
                DB::raw('SUM(sale_items.subtotal) as total_revenue')
            )
            ->groupBy('products.id', 'products.sku', 'products.name', 'categories.name', 'products.selling_price', 'products.quantity')
            ->orderBy('total_revenue', 'desc')
            ->get();

        $items = $rawItems->map(function ($item) {
            return [
                'product_id' => $item->product_id,
                'sku' => $item->sku ?? 'N/A',
                'name' => $item->product_name,
                'category' => $item->category_name ?? 'Uncategorized',
                'unit_price' => round((float)$item->unit_price, 2),
                'total_qty_sold' => (int)$item->total_qty_sold,
                'total_revenue' => round((float)$item->total_revenue, 2),
                'current_stock' => (int)$item->current_stock,
            ];
        });

        $totalItemsSold = $items->sum('total_qty_sold');
        $totalRevenue = round($items->sum('total_revenue'), 2);

        // Determine Peak (Top) Performer and Lowest Performer
        $topPerformer = null;
        $lowestPerformer = null;

        if ($items->count() > 0) {
            $sortedByQty = $items->sortByDesc('total_qty_sold')->values();
            $topPerformer = $sortedByQty->first();
            $lowestPerformer = $sortedByQty->last();
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'summary' => [
                    'total_items_sold' => $totalItemsSold,
                    'total_revenue' => $totalRevenue,
                    'top_performer' => $topPerformer,
                    'lowest_performer' => $lowestPerformer,
                ],
                'items' => $items->values()
            ]
        ]);
    }
}

