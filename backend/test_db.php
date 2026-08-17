<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;

try {
    $p = Product::create([
        'name' => 'Test Promo Item ' . time(),
        'slug' => 'test-promo-' . time(),
        'sku' => 'test-promo-' . time(),
        'purchase_price' => 1000,
        'selling_price' => 1800,
        'sale_price' => 1500,
        'quantity' => 10,
        'low_stock_warning' => 1
    ]);
    
    $p_fetched = Product::find($p->id);
    echo "Saved sale_price: " . ($p_fetched->sale_price ?? 'NULL') . "\n";
    
    // Update it
    $p_fetched->update([
        'sale_price' => 1400
    ]);
    
    $p_updated = Product::find($p->id);
    echo "Updated sale_price: " . ($p_updated->sale_price ?? 'NULL') . "\n";
    
    // Update to empty/null
    $p_updated->update([
        'sale_price' => null
    ]);
    
    $p_cleared = Product::find($p->id);
    echo "Cleared sale_price: " . ($p_cleared->sale_price ?? 'NULL') . "\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
