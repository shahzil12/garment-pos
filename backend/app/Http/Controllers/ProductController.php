<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    // ==========================================
    // Category Endpoints
    // ==========================================
    public function indexCategories()
    {
        $categories = Category::withCount('products')->get();
        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    public function storeCategory(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:categories,name']);
        
        $category = Category::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Category created', 'data' => $category], 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = Category::findOrFail($id);
        $request->validate(['name' => "required|string|max:255|unique:categories,name,{$id}"]);

        $category->update([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Category updated', 'data' => $category]);
    }

    public function destroyCategory($id)
    {
        $category = Category::findOrFail($id);
        $category->delete();
        return response()->json(['status' => 'success', 'message' => 'Category deleted']);
    }

    // ==========================================
    // Brand Endpoints
    // ==========================================
    public function indexBrands()
    {
        $brands = Brand::withCount('products')->get();
        return response()->json(['status' => 'success', 'data' => $brands]);
    }

    public function storeBrand(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:brands,name']);
        
        $brand = Brand::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Brand created', 'data' => $brand], 201);
    }

    public function updateBrand(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);
        $request->validate(['name' => "required|string|max:255|unique:brands,name,{$id}"]);

        $brand->update([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Brand updated', 'data' => $brand]);
    }

    public function destroyBrand($id)
    {
        $brand = Brand::findOrFail($id);
        $brand->delete();
        return response()->json(['status' => 'success', 'message' => 'Brand deleted']);
    }

    // ==========================================
    // Product Endpoints
    // ==========================================
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand']);

        // Search by name, SKU, Barcode, Sizes, or Colors
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('sizes', 'like', "%{$search}%")
                  ->orWhere('colors', 'like', "%{$search}%")
                  ->orWhere('variation_stock', 'like', "%{$search}%");
            });
        }

        // Category Filter
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Brand Filter
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        // Stock Status Filter
        if ($request->filled('stock_status')) {
            if ($request->stock_status === 'low') {
                $query->whereRaw('quantity <= low_stock_warning');
            } elseif ($request->stock_status === 'out') {
                $query->where('quantity', 0);
            }
        }

        $products = $query->orderBy('name', 'asc')->paginate($request->input('per_page', 10));

        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    public function store(Request $request)
    {
        \Log::info('Store Product request data:', $request->all());
        if (!$request->filled('barcode')) {
            do {
                $randomDigits = str_pad((string)mt_rand(0, 999999999), 9, '0', STR_PAD_LEFT);
                $barcodeWithoutCheck = '880' . $randomDigits;
                $sum = 0;
                for ($i = 0; $i < 12; $i++) {
                    $digit = (int)$barcodeWithoutCheck[$i];
                    $sum += ($i % 2 === 0) ? $digit : $digit * 3;
                }
                $checkDigit = (10 - ($sum % 10)) % 10;
                $generatedBarcode = $barcodeWithoutCheck . $checkDigit;
            } while (Product::where('barcode', $generatedBarcode)->exists());

            $request->merge(['barcode' => $generatedBarcode]);
        }
        $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:products,sku',
            'barcode' => 'nullable|string|unique:products,barcode',
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'low_stock_warning' => 'required|integer|min:0',
            'sizes' => 'nullable|array',
            'colors' => 'nullable|array',
            'size_stock' => 'nullable|string',
            'color_stock' => 'nullable|string',
            'image' => 'nullable|image|max:2048', // 2MB Max
        ], [
            'sku.unique' => 'The SKU already exists.',
            'barcode.unique' => 'The Barcode already exists.',
        ]);

        $data = $request->except('image');
        $data['slug'] = Str::slug($request->name);
        $data['barcode'] = $request->filled('barcode') ? $request->barcode : null;
        $data['category_id'] = $request->filled('category_id') ? $request->category_id : null;
        $data['brand_id'] = $request->filled('brand_id') ? $request->brand_id : null;
        $data['sale_price'] = $request->filled('sale_price') ? $request->sale_price : null;

        if ($request->filled('size_stock')) {
            $sizeStock = is_array($request->size_stock) ? $request->size_stock : json_decode($request->size_stock, true);
            $data['size_stock'] = is_array($sizeStock) ? $sizeStock : null;
            if (is_array($sizeStock) && count($sizeStock) > 0) {
                $data['quantity'] = array_sum($sizeStock);
            }
        } else {
            $data['size_stock'] = null;
        }

        if ($request->filled('color_stock')) {
            $colorStock = is_array($request->color_stock) ? $request->color_stock : json_decode($request->color_stock, true);
            $data['color_stock'] = is_array($colorStock) ? $colorStock : null;
            if (is_array($colorStock) && count($colorStock) > 0 && !isset($data['size_stock'])) {
                $data['quantity'] = array_sum($colorStock);
            }
        } else {
            $data['color_stock'] = null;
        }

        if ($request->filled('variation_stock')) {
            $varStock = is_array($request->variation_stock) ? $request->variation_stock : json_decode($request->variation_stock, true);
            $data['variation_stock'] = is_array($varStock) ? $varStock : null;
            if (is_array($varStock) && count($varStock) > 0) {
                $data['quantity'] = array_sum($varStock);
            }
        } else {
            $data['variation_stock'] = null;
        }

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image_path'] = Storage::url($path);
        }

        try {
            if (!Schema::hasColumn('products', 'size_stock')) unset($data['size_stock']);
            if (!Schema::hasColumn('products', 'color_stock')) unset($data['color_stock']);
            if (!Schema::hasColumn('products', 'variation_stock')) unset($data['variation_stock']);
            if (!Schema::hasColumn('products', 'sale_price')) unset($data['sale_price']);

            $product = Product::create($data);

            // Audit Trail
            try {
                AuditLog::create([
                    'user_id' => $request->user()?->id,
                    'action' => 'Product Created',
                    'description' => "Created product {$product->name} (SKU: {$product->sku})",
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            } catch (\Throwable $e) {
                \Log::warning('AuditLog creation error: ' . $e->getMessage());
            }

            return response()->json(['status' => 'success', 'message' => 'Product created', 'data' => $product], 201);
        } catch (\Throwable $e) {
            \Log::error('Error creating product: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create product: ' . $e->getMessage()
            ], 422);
        }
    }

    public function show($id)
    {
        $product = Product::with(['category', 'brand'])->findOrFail($id);
        return response()->json(['status' => 'success', 'data' => $product]);
    }

    public function update(Request $request, $id)
    {
        \Log::info('Update Product ID ' . $id . ' request data:', $request->all());
        $product = Product::findOrFail($id);

        if (!$request->filled('barcode')) {
            $request->merge(['barcode' => null]);
        }

        $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'name' => 'required|string|max:255',
            'sku' => ['required', 'string', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode' => ['nullable', 'string', Rule::unique('products', 'barcode')->ignore($product->id)],
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'quantity' => 'required|integer|min:0',
            'low_stock_warning' => 'required|integer|min:0',
            'sizes' => 'nullable|array',
            'colors' => 'nullable|array',
            'size_stock' => 'nullable|string',
            'color_stock' => 'nullable|string',
            'image' => 'nullable|image|max:2048', // 2MB Max
        ], [
            'sku.unique' => 'The SKU already exists.',
            'barcode.unique' => 'The Barcode already exists.',
        ]);

        $data = $request->except(['image', '_method']);
        $data['slug'] = Str::slug($request->name);
        $data['barcode'] = $request->filled('barcode') ? $request->barcode : null;
        $data['category_id'] = $request->filled('category_id') ? $request->category_id : null;
        $data['brand_id'] = $request->filled('brand_id') ? $request->brand_id : null;
        $data['sale_price'] = $request->filled('sale_price') ? $request->sale_price : null;

        if ($request->filled('size_stock')) {
            $sizeStock = is_array($request->size_stock) ? $request->size_stock : json_decode($request->size_stock, true);
            $data['size_stock'] = is_array($sizeStock) ? $sizeStock : null;
            if (is_array($sizeStock) && count($sizeStock) > 0) {
                $data['quantity'] = array_sum($sizeStock);
            }
        } else {
            $data['size_stock'] = null;
        }

        if ($request->filled('color_stock')) {
            $colorStock = is_array($request->color_stock) ? $request->color_stock : json_decode($request->color_stock, true);
            $data['color_stock'] = is_array($colorStock) ? $colorStock : null;
            if (is_array($colorStock) && count($colorStock) > 0 && !isset($data['size_stock'])) {
                $data['quantity'] = array_sum($colorStock);
            }
        } else {
            $data['color_stock'] = null;
        }

        if ($request->filled('variation_stock')) {
            $varStock = is_array($request->variation_stock) ? $request->variation_stock : json_decode($request->variation_stock, true);
            $data['variation_stock'] = is_array($varStock) ? $varStock : null;
            if (is_array($varStock) && count($varStock) > 0) {
                $data['quantity'] = array_sum($varStock);
            }
        } else {
            $data['variation_stock'] = null;
        }

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image_path) {
                $oldPath = str_replace('/storage/', '', $product->image_path);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('image')->store('products', 'public');
            $data['image_path'] = Storage::url($path);
        }

        try {
            if (!Schema::hasColumn('products', 'size_stock')) unset($data['size_stock']);
            if (!Schema::hasColumn('products', 'color_stock')) unset($data['color_stock']);
            if (!Schema::hasColumn('products', 'variation_stock')) unset($data['variation_stock']);
            if (!Schema::hasColumn('products', 'sale_price')) unset($data['sale_price']);

            $product->update($data);

            // Audit Trail
            try {
                AuditLog::create([
                    'user_id' => $request->user()?->id,
                    'action' => 'Product Updated',
                    'description' => "Updated product {$product->name} (SKU: {$product->sku})",
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            } catch (\Throwable $e) {
                \Log::warning('AuditLog creation error: ' . $e->getMessage());
            }

            return response()->json(['status' => 'success', 'message' => 'Product updated', 'data' => $product]);
        } catch (\Throwable $e) {
            \Log::error('Error updating product: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update product: ' . $e->getMessage()
            ], 422);
        }
    }

    public function destroy(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        // Delete image if exists
        if ($product->image_path) {
            $oldPath = str_replace('/storage/', '', $product->image_path);
            Storage::disk('public')->delete($oldPath);
        }

        // Audit Trail
        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'Product Deleted',
                'description' => "Deleted product {$product->name} (SKU: {$product->sku})",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {
            \Log::warning('AuditLog creation error: ' . $e->getMessage());
        }

        $product->delete();

        return response()->json(['status' => 'success', 'message' => 'Product deleted']);
    }

    // CSV Import / Export
    public function exportCSV()
    {
        $products = Product::with(['category', 'brand'])->get();
        $csvFileName = 'products_' . date('Ymd_His') . '.csv';
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$csvFileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['ID', 'Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Purchase Price', 'Selling Price', 'Quantity', 'Low Stock Warning', 'Sizes', 'Colors'];

        $callback = function() use($products, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($products as $p) {
                fputcsv($file, [
                    $p->id,
                    $p->name,
                    $p->sku,
                    $p->barcode,
                    $p->category?->name ?? 'N/A',
                    $p->brand?->name ?? 'N/A',
                    $p->purchase_price,
                    $p->selling_price,
                    $p->quantity,
                    $p->low_stock_warning,
                    implode(', ', $p->sizes ?? []),
                    implode(', ', $p->colors ?? []),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
