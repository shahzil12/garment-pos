<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'brand_id',
        'name',
        'slug',
        'sku',
        'barcode',
        'description',
        'sizes',
        'colors',
        'purchase_price',
        'selling_price',
        'sale_price',
        'quantity',
        'low_stock_warning',
        'image_path',
        'size_stock',
        'color_stock',
    ];

    protected $casts = [
        'sizes' => 'array',
        'colors' => 'array',
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'quantity' => 'integer',
        'low_stock_warning' => 'integer',
        'size_stock' => 'array',
        'color_stock' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($product) {
            if (empty($product->barcode)) {
                $product->barcode = static::generateUniqueBarcode();
            }
        });
    }

    public static function generateUniqueBarcode()
    {
        do {
            // Generate a 12-digit number starting with 880
            $randomDigits = mt_rand(100000000, 999999999);
            $barcodeWithoutCheck = '880' . $randomDigits;

            // Calculate EAN-13 check digit
            $sum = 0;
            for ($i = 0; $i < 12; $i++) {
                $digit = (int)$barcodeWithoutCheck[$i];
                $sum += ($i % 2 === 0) ? $digit : $digit * 3;
            }
            $checkDigit = (10 - ($sum % 10)) % 10;
            $barcode = $barcodeWithoutCheck . $checkDigit;
        } while (static::where('barcode', $barcode)->exists());

        return $barcode;
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function inventoryAdjustments()
    {
        return $this->hasMany(InventoryAdjustment::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }
}
