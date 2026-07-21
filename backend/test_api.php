<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use Illuminate\Http\Request;
use App\Http\Controllers\ProductController;

try {
    Product::query()->delete();
    $p = Product::create([
        'name' => 'Original Item',
        'slug' => 'original-item',
        'sku' => 'orig-sku',
        'purchase_price' => 1000,
        'selling_price' => 1800,
        'sale_price' => null,
        'quantity' => 10,
        'low_stock_warning' => 1
    ]);
    
    echo "Initial sale_price: " . (Product::find($p->id)->sale_price ?? 'NULL') . "\n";
    
    // Simulate Request
    $request = Request::create("/api/products/{$p->id}", 'POST', [
        'name' => 'Original Item',
        'sku' => 'orig-sku',
        'purchase_price' => 1000,
        'selling_price' => 1800,
        'sale_price' => '1500', // We send it as string like the frontend does
        'quantity' => 10,
        'low_stock_warning' => 1
    ]);

    // Mock user
    $user = \App\Models\User::first() ?: \App\Models\User::create([
        'name' => 'Admin', 'email' => 'admin@pos.com', 'password' => 'password', 'role' => 'admin', 'is_active' => true
    ]);
    $request->setUserResolver(function () use ($user) {
        return $user;
    });
    
    // Run controller update
    $controller = new ProductController();
    $response = $controller->update($request, $p->id);
    
    echo "Response status: " . $response->getStatusCode() . "\n";
    echo "Response content: " . $response->getContent() . "\n";
    
    $p_updated = Product::find($p->id);
    echo "After API update sale_price: " . ($p_updated->sale_price ?? 'NULL') . "\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
