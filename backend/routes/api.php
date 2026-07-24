<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\POSController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\BackupController;

// ==========================================
// Public Routes
// ==========================================
Route::post('/login', [AuthController::class, 'login']);

// ==========================================
// Protected Routes
// ==========================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Categories
    Route::get('/categories', [ProductController::class, 'indexCategories']);
    Route::post('/categories', [ProductController::class, 'storeCategory']);
    Route::put('/categories/{id}', [ProductController::class, 'updateCategory']);
    Route::delete('/categories/{id}', [ProductController::class, 'destroyCategory']);

    // Brands
    Route::get('/brands', [ProductController::class, 'indexBrands']);
    Route::post('/brands', [ProductController::class, 'storeBrand']);
    Route::put('/brands/{id}', [ProductController::class, 'updateBrand']);
    Route::delete('/brands/{id}', [ProductController::class, 'destroyBrand']);

    // Products
    Route::get('/products/export/csv', [ProductController::class, 'exportCSV']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::post('/products/{id}', [ProductController::class, 'update']); // Use POST because of multipart/form-data upload issue in Laravel PUT
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Inventory
    Route::get('/inventory/adjustments', [InventoryController::class, 'indexAdjustments']);
    Route::post('/inventory/adjustments', [InventoryController::class, 'storeAdjustment']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'getLowStockAlerts']);

    // Vendors
    Route::get('/vendors', [VendorController::class, 'indexVendors']);
    Route::post('/vendors', [VendorController::class, 'storeVendor']);
    Route::put('/vendors/{id}', [VendorController::class, 'updateVendor']);
    Route::delete('/vendors/{id}', [VendorController::class, 'destroyVendor']);
    
    Route::get('/vendors/purchase-orders', [VendorController::class, 'indexPurchaseOrders']);
    Route::post('/vendors/purchase-orders', [VendorController::class, 'storePurchaseOrder']);
    Route::post('/vendors/purchase-orders/{id}/status', [VendorController::class, 'updatePOStatus']);
    
    Route::post('/vendors/payments', [VendorController::class, 'storeVendorPayment']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);

    // POS Screen
    Route::get('/pos/search', [POSController::class, 'searchProducts']);
    Route::post('/pos/checkout', [POSController::class, 'checkout']);
    Route::get('/pos/invoices', [POSController::class, 'indexInvoices']);
    Route::get('/pos/invoices/{id}', [POSController::class, 'showInvoice']);
    Route::put('/pos/invoices/{id}/items', [POSController::class, 'updateInvoiceItems'])->middleware('can.edit.invoice');
    Route::post('/pos/invoices/{id}/refund', [POSController::class, 'refundInvoice']);

    // Expenses
    Route::get('/expenses/categories', [ExpenseController::class, 'indexCategories']);
    Route::post('/expenses/categories', [ExpenseController::class, 'storeCategory']);
    Route::put('/expenses/categories/{id}', [ExpenseController::class, 'updateCategory']);
    Route::delete('/expenses/categories/{id}', [ExpenseController::class, 'destroyCategory']);
    
    Route::get('/expenses', [ExpenseController::class, 'indexExpenses']);
    Route::post('/expenses', [ExpenseController::class, 'storeExpense']);
    Route::put('/expenses/{id}', [ExpenseController::class, 'updateExpense']);
    Route::delete('/expenses/{id}', [ExpenseController::class, 'destroyExpense']);

    // Reports
    Route::get('/reports/sales', [ReportController::class, 'getSalesReport']);
    Route::get('/reports/profit-loss', [ReportController::class, 'getProfitLossReport']);
    Route::get('/reports/analytics', [ReportController::class, 'getAnalyticsReport']);
    Route::get('/reports/expenses', [ReportController::class, 'getExpenseReport']);
    Route::get('/reports/inventory', [ReportController::class, 'getInventoryReport']);
    Route::get('/reports/vendors', [ReportController::class, 'getVendorReport']);
    Route::get('/reports/cashiers', [ReportController::class, 'getCashierReport']);

    // Employees
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{id}', [EmployeeController::class, 'update']);
    Route::post('/employees/{id}/toggle-status', [EmployeeController::class, 'toggleStatus']);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::post('/settings', [SettingController::class, 'update']);

    // Backups
    Route::get('/backups', [BackupController::class, 'getBackups']);
    Route::post('/backups', [BackupController::class, 'createBackup']);
    Route::get('/backups/{filename}', [BackupController::class, 'downloadBackup']);
    Route::delete('/backups/{filename}', [BackupController::class, 'deleteBackup']);
    Route::post('/backups/restore', [BackupController::class, 'restoreBackup']);
});
