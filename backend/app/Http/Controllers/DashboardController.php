<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $today = Carbon::today();
            $startOfMonth = Carbon::now()->startOfMonth();
            $endOfMonth = Carbon::now()->endOfMonth();

            $hasSoftDeletes = Schema::hasColumn('sales', 'deleted_at');

            // 1. Today's Sales
            $todaySalesQuery = DB::table('sales')
                ->whereDate('sale_date', $today)
                ->where('status', 'completed');
            if ($hasSoftDeletes) {
                $todaySalesQuery->whereNull('deleted_at');
            }
            $todaySales = $todaySalesQuery->sum('payable_amount') ?? 0;

            // 2. Today's Profit
            $todayRevenueQuery = DB::table('sales')
                ->whereDate('sale_date', $today)
                ->where('status', 'completed');
            if ($hasSoftDeletes) {
                $todayRevenueQuery->whereNull('deleted_at');
            }
            $todayRevenueExTax = $todayRevenueQuery->sum(DB::raw('payable_amount - COALESCE(tax_amount, 0)')) ?? 0;

            $todayCogsQuery = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->whereDate('sales.sale_date', $today)
                ->where('sales.status', 'completed');
            if ($hasSoftDeletes) {
                $todayCogsQuery->whereNull('sales.deleted_at');
            }
            $todayCogs = $todayCogsQuery
                ->select(DB::raw('SUM(COALESCE(products.purchase_price, 0) * sale_items.quantity) as cost'))
                ->first()->cost ?? 0;

            $todayProfit = $todayRevenueExTax - $todayCogs;

            // 3. Monthly Sales
            $monthlySalesQuery = DB::table('sales')
                ->whereBetween('sale_date', [$startOfMonth, $endOfMonth])
                ->where('status', 'completed');
            if ($hasSoftDeletes) {
                $monthlySalesQuery->whereNull('deleted_at');
            }
            $monthlySales = $monthlySalesQuery->sum('payable_amount') ?? 0;

            // 4. Monthly Profit
            $monthlyRevenueQuery = DB::table('sales')
                ->whereBetween('sale_date', [$startOfMonth, $endOfMonth])
                ->where('status', 'completed');
            if ($hasSoftDeletes) {
                $monthlyRevenueQuery->whereNull('deleted_at');
            }
            $monthlyRevenueExTax = $monthlyRevenueQuery->sum(DB::raw('payable_amount - COALESCE(tax_amount, 0)')) ?? 0;

            $monthlyCogsQuery = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->whereBetween('sales.sale_date', [$startOfMonth, $endOfMonth])
                ->where('sales.status', 'completed');
            if ($hasSoftDeletes) {
                $monthlyCogsQuery->whereNull('sales.deleted_at');
            }
            $monthlyCogs = $monthlyCogsQuery
                ->select(DB::raw('SUM(COALESCE(products.purchase_price, 0) * sale_items.quantity) as cost'))
                ->first()->cost ?? 0;

            $monthlyProfit = $monthlyRevenueExTax - $monthlyCogs;

            // 5. Expenses (Today & Monthly)
            $todayExpenses = Expense::whereDate('date', $today)->sum('amount') ?? 0;
            $monthlyExpenses = Expense::whereBetween('date', [$startOfMonth, $endOfMonth])->sum('amount') ?? 0;

            // 6. Stock Alerts (Low stock products)
            $lowStockCount = Product::whereRaw('quantity <= low_stock_warning')->count();
            $lowStockAlerts = Product::with(['category', 'brand'])
                ->whereRaw('quantity <= low_stock_warning')
                ->take(5)
                ->get();

            // 7. Recent Sales
            $recentSalesQuery = DB::table('sales')
                ->leftJoin('customers', 'sales.customer_id', '=', 'customers.id')
                ->leftJoin('users', 'sales.user_id', '=', 'users.id');
            if ($hasSoftDeletes) {
                $recentSalesQuery->whereNull('sales.deleted_at');
            }
            $recentSalesRaw = $recentSalesQuery
                ->select(
                    'sales.id',
                    'sales.invoice_number',
                    'sales.payable_amount',
                    'sales.status',
                    'sales.sale_date',
                    'customers.name as customer_name',
                    'users.name as user_name'
                )
                ->orderBy('sales.sale_date', 'desc')
                ->take(5)
                ->get();

            $recentSales = $recentSalesRaw->map(function ($s) {
                return [
                    'id' => $s->id,
                    'invoice_number' => $s->invoice_number,
                    'payable_amount' => $s->payable_amount,
                    'status' => $s->status,
                    'sale_date' => $s->sale_date,
                    'customer' => $s->customer_name ? ['name' => $s->customer_name] : null,
                    'user' => $s->user_name ? ['name' => $s->user_name] : null,
                ];
            });

            // 8. Top Selling Products
            $topSellingQuery = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->where('sales.status', 'completed');
            if ($hasSoftDeletes) {
                $topSellingQuery->whereNull('sales.deleted_at');
            }

            $topSelling = $topSellingQuery
                ->select(
                    'products.id',
                    'products.name',
                    'products.sku',
                    DB::raw('SUM(sale_items.quantity) as total_qty'),
                    DB::raw('SUM(sale_items.subtotal) as total_revenue')
                )
                ->groupBy('products.id', 'products.name', 'products.sku')
                ->orderBy(DB::raw('SUM(sale_items.quantity)'), 'desc')
                ->take(5)
                ->get();

            // 9. Sales Graph Data (Last 30 days)
            $graphQuery = DB::table('sales')
                ->where('status', 'completed')
                ->where('sale_date', '>=', Carbon::now()->subDays(30));
            if ($hasSoftDeletes) {
                $graphQuery->whereNull('sales.deleted_at');
            }

            $graphData = $graphQuery
                ->select(
                    DB::raw('DATE(sale_date) as date'),
                    DB::raw('SUM(payable_amount) as sales'),
                    DB::raw('COUNT(*) as transactions')
                )
                ->groupBy(DB::raw('DATE(sale_date)'))
                ->orderBy(DB::raw('DATE(sale_date)'), 'asc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'stats' => [
                        'today_sales' => round((float)$todaySales, 2),
                        'today_profit' => round((float)$todayProfit, 2),
                        'today_expenses' => round((float)$todayExpenses, 2),
                        'monthly_sales' => round((float)$monthlySales, 2),
                        'monthly_profit' => round((float)$monthlyProfit, 2),
                        'monthly_expenses' => round((float)$monthlyExpenses, 2),
                        'low_stock_count' => (int)$lowStockCount,
                    ],
                    'low_stock_alerts' => $lowStockAlerts,
                    'recent_sales' => $recentSales,
                    'top_selling' => $topSelling,
                    'sales_chart' => $graphData,
                ]
            ]);
        } catch (\Throwable $e) {
            Log::error('Dashboard data error: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load dashboard metrics',
                'error_detail' => $e->getMessage(),
            ], 500);
        }
    }
}


