<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Expense;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // 1. Sales & Profit Stats
        // Today's Sales
        $todaySales = Sale::whereDate('sale_date', $today)->where('status', 'completed')->sum('payable_amount');

        // Today's Profit (excluding tax and including overall discounts)
        $todayRevenueExTax = Sale::whereDate('sale_date', $today)
            ->where('status', 'completed')
            ->sum(DB::raw('payable_amount - tax_amount'));

        $todayCogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereDate('sales.sale_date', $today)
            ->where('sales.status', 'completed')
            ->select(DB::raw('SUM(products.purchase_price * sale_items.quantity) as cost'))
            ->first()->cost ?? 0;

        $todayProfit = $todayRevenueExTax - $todayCogs;

        // Monthly Sales
        $monthlySales = Sale::whereBetween('sale_date', [$startOfMonth, $endOfMonth])
            ->where('status', 'completed')
            ->sum('payable_amount');

        // Monthly Profit (excluding tax and including overall discounts)
        $monthlyRevenueExTax = Sale::whereBetween('sale_date', [$startOfMonth, $endOfMonth])
            ->where('status', 'completed')
            ->sum(DB::raw('payable_amount - tax_amount'));

        $monthlyCogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereBetween('sales.sale_date', [$startOfMonth, $endOfMonth])
            ->where('sales.status', 'completed')
            ->select(DB::raw('SUM(products.purchase_price * sale_items.quantity) as cost'))
            ->first()->cost ?? 0;

        $monthlyProfit = $monthlyRevenueExTax - $monthlyCogs;

        // 2. Expenses (Today & Monthly)
        $todayExpenses = Expense::whereDate('date', $today)->sum('amount');
        $monthlyExpenses = Expense::whereBetween('date', [$startOfMonth, $endOfMonth])->sum('amount');

        // 3. Stock Alerts (Low stock products)
        $lowStockCount = Product::whereRaw('quantity <= low_stock_warning')->count();
        $lowStockAlerts = Product::with(['category', 'brand'])
            ->whereRaw('quantity <= low_stock_warning')
            ->take(5)
            ->get();

        // 4. Recent Sales
        $recentSales = Sale::with(['customer', 'user'])
            ->orderBy('sale_date', 'desc')
            ->take(5)
            ->get();

        // 5. Top Selling Products
        $topSelling = DB::table('sale_items')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select('products.name', 'products.sku', DB::raw('SUM(sale_items.quantity) as total_qty'), DB::raw('SUM(sale_items.subtotal) as total_revenue'))
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderBy('total_qty', 'desc')
            ->take(5)
            ->get();

        // 6. Sales Graph Data (Last 30 days)
        $graphData = DB::table('sales')
            ->where('status', 'completed')
            ->where('sale_date', '>=', Carbon::now()->subDays(30))
            ->select(DB::raw('DATE(sale_date) as date'), DB::raw('SUM(payable_amount) as sales'), DB::raw('COUNT(*) as transactions'))
            ->groupBy(DB::raw('DATE(sale_date)'))
            ->orderBy(DB::raw('DATE(sale_date)'), 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'stats' => [
                    'today_sales' => round($todaySales, 2),
                    'today_profit' => round($todayProfit, 2),
                    'today_expenses' => round($todayExpenses, 2),
                    'monthly_sales' => round($monthlySales, 2),
                    'monthly_profit' => round($monthlyProfit, 2),
                    'monthly_expenses' => round($monthlyExpenses, 2),
                    'low_stock_count' => $lowStockCount,
                ],
                'low_stock_alerts' => $lowStockAlerts,
                'recent_sales' => $recentSales,
                'top_selling' => $topSelling,
                'sales_chart' => $graphData,
            ]
        ]);
    }
}
