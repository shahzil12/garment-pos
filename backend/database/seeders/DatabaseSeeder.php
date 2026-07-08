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
            'currency_symbol' => '$',
            'currency_code' => 'USD',
            'tax_rate' => '8.25', // 8.25%
            'receipt_header' => 'Welcome to Vogue Garments!',
            'receipt_footer' => 'Thank you for shopping with us! Ref: Returnable in 14 days.',
        ];

        foreach ($settings as $key => $value) {
            Setting::create([
                'key' => $key,
                'value' => $value,
            ]);
        }

        // 3. Categories
        $categoriesData = [
            ['name' => 'T-Shirts', 'description' => 'Casual graphic and plain t-shirts'],
            ['name' => 'Denim & Jeans', 'description' => 'Premium denim and jeans for men and women'],
            ['name' => 'Jackets & Outerwear', 'description' => 'Coats, jackets, and windbreakers'],
            ['name' => 'Shirts & Polos', 'description' => 'Formal and semi-formal button downs and polo shirts'],
            ['name' => 'Dresses & Skirts', 'description' => 'Elegant dresses and casual skirts'],
        ];

        $categories = [];
        foreach ($categoriesData as $c) {
            $categories[] = Category::create([
                'name' => $c['name'],
                'slug' => Str::slug($c['name']),
                'description' => $c['description'],
            ]);
        }

        // 4. Brands
        $brandsData = [
            ['name' => 'Levi\'s', 'description' => 'Original American denim brand'],
            ['name' => 'Zara', 'description' => 'Fast-fashion clothing and accessories'],
            ['name' => 'H&M', 'description' => 'Swedish multinational clothing retailer'],
            ['name' => 'Uniqlo', 'description' => 'Casual wear designer, manufacturer and retailer'],
            ['name' => 'Vogue Originals', 'description' => 'In-house premium design apparel'],
        ];

        $brands = [];
        foreach ($brandsData as $b) {
            $brands[] = Brand::create([
                'name' => $b['name'],
                'slug' => Str::slug($b['name']),
                'description' => $b['description'],
            ]);
        }

        // 5. Products
        $productsData = [
            [
                'category_id' => 1, // T-Shirts
                'brand_id' => 4,    // Uniqlo
                'name' => 'Supima Cotton Crew Neck T-Shirt',
                'sku' => 'TS-SUP-UNI-001',
                'barcode' => '8801234567891',
                'description' => '100% Supima cotton crew neck t-shirt with smooth texture and clean fit.',
                'sizes' => ['S', 'M', 'L', 'XL'],
                'colors' => ['White', 'Black', 'Navy', 'Heather Gray', 'Olive'],
                'purchase_price' => 7.50,
                'selling_price' => 19.90,
                'quantity' => 150,
                'low_stock_warning' => 15,
            ],
            [
                'category_id' => 2, // Denim
                'brand_id' => 1,    // Levi's
                'name' => '511 Slim Fit Men\'s Jeans',
                'sku' => 'JN-511-LEV-002',
                'barcode' => '8801234567892',
                'description' => 'The original slim fit jeans, designed with a close but comfortable leg.',
                'sizes' => ['30/30', '32/30', '32/32', '34/32', '36/32'],
                'colors' => ['Dark Indigo', 'Light Wash', 'Jet Black'],
                'purchase_price' => 28.00,
                'selling_price' => 69.50,
                'quantity' => 80,
                'low_stock_warning' => 10,
            ],
            [
                'category_id' => 3, // Outerwear
                'brand_id' => 2,    // Zara
                'name' => 'Faux Leather Biker Jacket',
                'sku' => 'JK-FML-ZAR-003',
                'barcode' => '8801234567893',
                'description' => 'Zara man biker jacket featuring a lapel collar, long sleeves, and metallic zips.',
                'sizes' => ['M', 'L', 'XL'],
                'colors' => ['Black', 'Dark Brown'],
                'purchase_price' => 45.00,
                'selling_price' => 99.90,
                'quantity' => 12, // Low stock!
                'low_stock_warning' => 15,
            ],
            [
                'category_id' => 4, // Shirts
                'brand_id' => 3,    // H&M
                'name' => 'Slim Fit Oxford Shirt',
                'sku' => 'SH-OXF-HM-004',
                'barcode' => '8801234567894',
                'description' => 'Long-sleeved shirt in sturdy cotton oxford fabric with a button-down collar.',
                'sizes' => ['S', 'M', 'L', 'XL'],
                'colors' => ['Light Blue', 'White', 'Pink'],
                'purchase_price' => 12.00,
                'selling_price' => 29.99,
                'quantity' => 45,
                'low_stock_warning' => 8,
            ],
            [
                'category_id' => 5, // Dresses
                'brand_id' => 5,    // Vogue Originals
                'name' => 'Summer Floral A-Line Dress',
                'sku' => 'DR-FLR-VOG-005',
                'barcode' => '8801234567895',
                'description' => 'Lightweight summer floral print A-line dress featuring a flattering wrap V-neck.',
                'sizes' => ['XS', 'S', 'M', 'L'],
                'colors' => ['Yellow Floral', 'Blue Floral', 'Red Floral'],
                'purchase_price' => 22.00,
                'selling_price' => 55.00,
                'quantity' => 30,
                'low_stock_warning' => 5,
            ],
            [
                'category_id' => 1, // T-Shirts
                'brand_id' => 5,    // Vogue Originals
                'name' => 'Minimalist Embroidered Logo Tee',
                'sku' => 'TS-MIN-VOG-006',
                'barcode' => '8801234567896',
                'description' => 'Heavyweight cotton t-shirt with a small hand-embroidered Vogue logo.',
                'sizes' => ['S', 'M', 'L'],
                'colors' => ['Cream', 'Sage Green', 'Dusty Rose'],
                'purchase_price' => 9.00,
                'selling_price' => 24.99,
                'quantity' => 60,
                'low_stock_warning' => 10,
            ],
            [
                'category_id' => 2, // Denim
                'brand_id' => 2,    // Zara
                'name' => 'High-Waist Mom Jeans',
                'sku' => 'JN-MOM-ZAR-007',
                'barcode' => '8801234567897',
                'description' => 'Retro high-waisted mom jeans with five pockets and relaxed tapered fit.',
                'sizes' => ['26', '28', '30', '32'],
                'colors' => ['Bleached Blue', 'Vintage Blue'],
                'purchase_price' => 20.00,
                'selling_price' => 49.90,
                'quantity' => 4, // Low Stock!
                'low_stock_warning' => 10,
            ],
            [
                'category_id' => 3, // Outerwear
                'brand_id' => 4,    // Uniqlo
                'name' => 'Ultra Light Down Jacket',
                'sku' => 'JK-ULD-UNI-008',
                'barcode' => '8801234567898',
                'description' => 'Unbelievably thin and warm down jacket that packs away into a compact carrying pouch.',
                'sizes' => ['S', 'M', 'L', 'XL', 'XXL'],
                'colors' => ['Navy', 'Black', 'Wine Red', 'Olive', 'Mustard'],
                'purchase_price' => 35.00,
                'selling_price' => 79.90,
                'quantity' => 40,
                'low_stock_warning' => 10,
            ]
        ];

        $products = [];
        foreach ($productsData as $p) {
            $products[] = Product::create(array_merge($p, [
                'slug' => Str::slug($p['name']),
            ]));
        }

        // 6. Customers
        $customersData = [
            ['name' => 'Walk-In Customer', 'email' => null, 'phone' => null, 'address' => null, 'loyalty_points' => 0],
            ['name' => 'Michael Scott', 'email' => 'michael@dundermifflin.com', 'phone' => '555-010-0909', 'address' => 'Scranton, PA', 'loyalty_points' => 150],
            ['name' => 'Pam Beesly', 'email' => 'pam@dundermifflin.com', 'phone' => '555-011-2342', 'address' => 'Scranton, PA', 'loyalty_points' => 85],
            ['name' => 'Dwight Schrute', 'email' => 'dwight@schrutebeetfarms.com', 'phone' => '555-015-9988', 'address' => 'Beet Farms, Scranton, PA', 'loyalty_points' => 320],
            ['name' => 'Rachel Green', 'email' => 'rachel@ralphlauren.com', 'phone' => '555-018-8772', 'address' => 'Greenwich Village, NYC', 'loyalty_points' => 540],
        ];

        $customers = [];
        foreach ($customersData as $c) {
            $customers[] = Customer::create($c);
        }

        // 7. Vendors
        $vendorsData = [
            ['name' => 'TexWorld Fabrics Inc.', 'contact_person' => 'Robert Vance', 'email' => 'vance@texworld.com', 'phone' => '555-013-0901', 'address' => 'Garment District, New York'],
            ['name' => 'Indigo Denim Suppliers', 'contact_person' => 'Silvio Dante', 'email' => 'orders@indigodenim.com', 'phone' => '555-014-9982', 'address' => 'Newark, NJ'],
            ['name' => 'Global Apparel Logistics', 'contact_person' => 'Gus Fring', 'email' => 'logistics@globalapparel.com', 'phone' => '555-019-4823', 'address' => 'Albuquerque, NM'],
        ];

        $vendors = [];
        foreach ($vendorsData as $v) {
            $vendors[] = Vendor::create($v);
        }

        // 8. Purchase Orders (Vendor Purchases)
        // Order 1: Received
        $po1 = PurchaseOrder::create([
            'vendor_id' => $vendors[0]->id,
            'order_date' => Carbon::now()->subDays(25),
            'status' => 'received',
            'total_amount' => 1250.00,
            'paid_amount' => 1250.00,
            'payment_status' => 'paid',
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $po1->id,
            'product_id' => $products[0]->id, // Supima Tee
            'quantity' => 100,
            'unit_price' => 7.50,
            'total_price' => 750.00,
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $po1->id,
            'product_id' => $products[5]->id, // Logo Tee
            'quantity' => 50,
            'unit_price' => 9.00,
            'total_price' => 450.00,
        ]);
        VendorPayment::create([
            'vendor_id' => $vendors[0]->id,
            'purchase_order_id' => $po1->id,
            'payment_date' => Carbon::now()->subDays(25),
            'amount' => 1250.00,
            'payment_method' => 'Bank Transfer',
            'note' => 'Fully paid invoice'
        ]);

        // Order 2: Ordered/Pending
        $po2 = PurchaseOrder::create([
            'vendor_id' => $vendors[1]->id,
            'order_date' => Carbon::now()->subDays(3),
            'status' => 'ordered',
            'total_amount' => 1400.00,
            'paid_amount' => 500.00,
            'payment_status' => 'partial',
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $po2->id,
            'product_id' => $products[1]->id, // Levi's Jeans
            'quantity' => 50,
            'unit_price' => 28.00,
            'total_price' => 1400.00,
        ]);
        VendorPayment::create([
            'vendor_id' => $vendors[1]->id,
            'purchase_order_id' => $po2->id,
            'payment_date' => Carbon::now()->subDays(3),
            'amount' => 500.00,
            'payment_method' => 'Cheque',
            'note' => 'Advance payment'
        ]);

        // 9. Expense Categories & Expenses
        $expenseCategories = [
            'Rent & Utilities',
            'Staff Salaries',
            'Store Marketing',
            'Packaging Material',
            'Office Supplies',
        ];

        $expCats = [];
        foreach ($expenseCategories as $ec) {
            $expCats[] = ExpenseCategory::create(['name' => $ec]);
        }

        // Add daily expenses over past 30 days
        $expenseEvents = [
            ['cat_idx' => 0, 'amount' => 1200.00, 'days_ago' => 28, 'desc' => 'Monthly store rent'],
            ['cat_idx' => 0, 'amount' => 230.50, 'days_ago' => 15, 'desc' => 'Electricity bill'],
            ['cat_idx' => 3, 'amount' => 85.00, 'days_ago' => 20, 'desc' => 'Shopping bags and boxes'],
            ['cat_idx' => 2, 'amount' => 150.00, 'days_ago' => 12, 'desc' => 'Facebook / Instagram Ads'],
            ['cat_idx' => 4, 'amount' => 45.90, 'days_ago' => 5, 'desc' => 'Printer paper and thermal rolls'],
            ['cat_idx' => 1, 'amount' => 1500.00, 'days_ago' => 1, 'desc' => 'Staff wages'],
        ];

        foreach ($expenseEvents as $ee) {
            Expense::create([
                'expense_category_id' => $expCats[$ee['cat_idx']]->id,
                'amount' => $ee['amount'],
                'date' => Carbon::now()->subDays($ee['days_ago']),
                'description' => $ee['desc'],
            ]);
        }

        // 10. Sales (Spread over 30 days)
        // We will generate about 40 sales with varying totals to create beautiful graphs.
        $saleIdCounter = 1001;
        $totalSalesCount = 38;

        for ($i = $totalSalesCount; $i >= 0; $i--) {
            $saleDate = Carbon::now()->subDays($i)->subHours(rand(1, 8))->subMinutes(rand(0, 59));
            $cust = $customers[rand(0, count($customers) - 1)];
            
            // Randomly select 1 to 3 items
            $itemCount = rand(1, 3);
            $selectedProducts = array_slice($products, rand(0, count($products) - $itemCount), $itemCount);
            
            $subtotal = 0;
            $itemsToCreate = [];
            
            foreach ($selectedProducts as $prod) {
                $qty = rand(1, 2);
                $unitPrice = $prod->selling_price;
                $disc = rand(0, 1) ? ($unitPrice * 0.1) : 0; // 10% discount sometimes
                $lineSub = ($unitPrice - $disc) * $qty;
                
                $subtotal += $lineSub;
                $itemsToCreate[] = [
                    'product_id' => $prod->id,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'discount' => $disc * $qty,
                    'tax' => $lineSub * 0.0825,
                    'subtotal' => $lineSub,
                    'size' => $prod->sizes[array_rand($prod->sizes)],
                    'color' => $prod->colors[array_rand($prod->colors)],
                ];
            }

            $discountAmount = array_sum(array_column($itemsToCreate, 'discount'));
            $taxAmount = $subtotal * 0.0825;
            $payable = $subtotal + $taxAmount;

            $paymentMethod = ['cash', 'card', 'mobile_wallet'][rand(0, 2)];
            $invoiceNumber = 'INV-' . Carbon::parse($saleDate)->format('Ymd') . '-' . $saleIdCounter++;

            $sale = Sale::create([
                'customer_id' => $cust->id === 1 ? null : $cust->id, // Walk-in is null in db
                'user_id' => $cashier->id,
                'invoice_number' => $invoiceNumber,
                'sale_date' => $saleDate,
                'total_amount' => $subtotal + $discountAmount, // gross
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'payable_amount' => $payable,
                'paid_amount' => $payable,
                'payment_method' => $paymentMethod,
                'status' => 'completed',
                'notes' => rand(0, 10) > 8 ? 'Customer requested eco-friendly packaging.' : null,
                'created_at' => $saleDate,
                'updated_at' => $saleDate,
            ]);

            foreach ($itemsToCreate as $item) {
                SaleItem::create(array_merge($item, [
                    'sale_id' => $sale->id,
                    'created_at' => $saleDate,
                    'updated_at' => $saleDate,
                ]));
                
                // Reduce product quantity slightly
                $productModel = Product::find($item['product_id']);
                if ($productModel) {
                    $productModel->decrement('quantity', $item['quantity']);
                }
            }

            // Award loyalty points to customers (1 point per $10 spent)
            if ($cust->id !== 1) {
                $cust->increment('loyalty_points', floor($payable / 10));
            }
        }

        // 11. Audit Logs
        $logs = [
            ['user_id' => $admin->id, 'action' => 'Settings Updated', 'description' => 'System settings initialized.'],
            ['user_id' => $admin->id, 'action' => 'Bulk Import', 'description' => 'Initial garment catalog loaded (8 items).'],
            ['user_id' => $cashier->id, 'action' => 'POS Session Opened', 'description' => 'Cashier Jane started a new POS session.'],
        ];

        foreach ($logs as $l) {
            AuditLog::create(array_merge($l, [
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'created_at' => Carbon::now()->subDays(2),
            ]));
        }
    }
}
