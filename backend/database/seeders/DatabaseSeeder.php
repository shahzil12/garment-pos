<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Setting;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Vendor;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\VendorPayment;
use App\Models\ExpenseCategory;
use App\Models\Expense;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\AuditLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Prevent duplicate seeding
        if (User::exists() || Setting::exists() || Product::exists() || Customer::exists() || Sale::exists()) {
            return;
        }

        // 1. Users
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@pos.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $cashier = User::create([
            'name' => 'Jane Cashier',
            'email' => 'cashier@pos.com',
            'password' => Hash::make('password'),
            'role' => 'cashier',
            'is_active' => true,
        ]);

        // 2. Settings
        $settings = [
            'shop_name' => 'Vogue Garments',
            'shop_email' => 'info@voguegarments.com',
            'shop_phone' => '+1 (555) 019-2834',
            'shop_address' => '456 Fashion Boulevard, Suite 100, New York, NY 10001',
            'currency_symbol' => 'Rs.',
            'currency_code' => 'PKR',
            'tax_rate' => '8.25', // 8.25%
            'receipt_header' => 'Welcome to Vogue Garments!',
            'receipt_footer' => 'Thank you for shopping with us! Ref: Returnable in 14 days.',
            'cashier_can_access_dashboard' => '1',
            'cashier_can_access_pos' => '1',
            'cashier_can_access_products' => '1',
            'cashier_can_access_customers' => '1',
            'cashier_can_access_invoices' => '1',
        ];

        foreach ($settings as $key => $value) {
            Setting::create([
                'key' => $key,
                'value' => $value,
            ]);
        }

        // 3. Customers (Default Walk-In Customer)
        Customer::create([
            'name' => 'Walk-In Customer',
            'email' => null,
            'phone' => null,
            'address' => null,
            'loyalty_points' => 0,
        ]);
    }
}
