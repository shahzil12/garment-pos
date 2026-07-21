<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use Illuminate\Http\Request;

try {
    // Clear and create a product with sale price
    Product::query()->delete();
    $p = Product::create([
        'name' => 'Demo Shirt',
        'slug' => 'demo-shirt',
        'sku' => 'demo-sku',
        'purchase_price' => 1000,
        'selling_price' => 1800,
        'sale_price' => 1500,
        'quantity' => 10,
        'low_stock_warning' => 1
    ]);
    
    // Simulate GET request to index
    $request = Request::create('/api/products', 'GET');
    
    // Mock user
    $user = \App\Models\User::first() ?: \App\Models\User::create([
        'name' => 'Admin', 'email' => 'admin@pos.com', 'password' => 'password', 'role' => 'admin', 'is_active' => true
    ]);
    $request->setUserResolver(function () use ($user) {
        return $user;
    });

    // Run router
    $response = $app->handle($request);
    echo "Status: " . $response->getStatusCode() . "\n";
    echo "JSON: " . $response->getContent() . "\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
