<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Customer;
use App\Models\InventoryAdjustment;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class POSController extends Controller
{
    public function searchProducts(Request $request)
    {
        $query = Product::with(['category', 'brand']);

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('barcode', '=', $q); // exact barcode match for scanner
            });
        }

        // Return results (limit to 30 for quick load)
        $products = $query->take(30)->get();

        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }

    public function checkout(Request $request)
    {
        $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.original_price' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'discount_amount' => 'required|numeric|min:0',
            'tax_amount' => 'required|numeric|min:0',
            'payable_amount' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,mobile_wallet,split',
            'notes' => 'nullable|string',
        ]);

        $sale = DB::transaction(function() use ($request) {
            // 1. Check stock for all items
            foreach ($request->items as $item) {
                $prod = Product::findOrFail($item['product_id']);
                $size = $item['size'] ?? null;
                if ($prod->size_stock && $size && isset($prod->size_stock[$size])) {
                    if ($prod->size_stock[$size] < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product '{$prod->name}' (Size: {$size}). Current stock is {$prod->size_stock[$size]}.");
                    }
                } else {
                    if ($prod->quantity < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product '{$prod->name}'. Current stock is {$prod->quantity}.");
                    }
                }
            }

            // 2. Generate unique invoice number
            $today = Carbon::now()->format('Ymd');
            $random = strtoupper(substr(uniqid(), -4));
            $invoiceNumber = "INV-{$today}-{$random}";

            // 3. Create Sale
            $totalAmount = 0;
            foreach ($request->items as $item) {
                $totalAmount += $item['quantity'] * $item['unit_price'];
            }

            $sale = Sale::create([
                'customer_id' => $request->customer_id,
                'user_id' => $request->user()->id,
                'invoice_number' => $invoiceNumber,
                'sale_date' => Carbon::now(),
                'total_amount' => $totalAmount,
                'discount_amount' => $request->discount_amount,
                'tax_amount' => $request->tax_amount,
                'payable_amount' => $request->payable_amount,
                'paid_amount' => $request->paid_amount,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
                'notes' => $request->notes,
            ]);

            // 4. Create Sale Items and deduct inventory
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                
                // Deduct stock size-wise if tracked
                $size = $item['size'] ?? null;
                if ($product->size_stock && $size && isset($product->size_stock[$size])) {
                    $sizeStock = $product->size_stock;
                    $sizeStock[$size] -= $item['quantity'];
                    $product->size_stock = $sizeStock;
                    $product->save();
                }
                
                // Deduct stock
                $product->decrement('quantity', $item['quantity']);

                // Create Sale Item
                $discount = $item['discount'] ?? 0;
                $tax = $item['tax'] ?? 0;
                $subtotal = ($item['unit_price'] - $discount) * $item['quantity'] + $tax;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $discount * $item['quantity'],
                    'tax' => $tax,
                    'subtotal' => $subtotal,
                    'size' => $item['size'] ?? null,
                    'color' => $item['color'] ?? null,
                    'original_price' => $item['original_price'] ?? null,
                ]);

                // Create inventory adjustment log
                InventoryAdjustment::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => 'out',
                    'quantity' => $item['quantity'],
                    'reason' => "Sale checkout (Invoice: {$invoiceNumber})",
                ]);
            }

            // 5. Update Customer loyalty points
            if ($request->customer_id) {
                $customer = Customer::find($request->customer_id);
                if ($customer && $customer->id !== 1) { // 1 is Walk-in
                    // 1 point per $10 spent
                    $pointsEarned = floor($request->payable_amount / 10);
                    $customer->increment('loyalty_points', $pointsEarned);
                }
            }

            // 6. Audit Log
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'POS Sale Checkout',
                'description' => "Completed checkout for Invoice {$invoiceNumber} (Total: {$request->payable_amount})",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $sale;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Checkout completed successfully',
            'data' => $sale->load(['customer', 'user', 'items.product'])
        ], 201);
    }

    public function indexInvoices(Request $request)
    {
        try {
            $query = Sale::with(['customer', 'user']);

            if (!Schema::hasColumn('sales', 'deleted_at')) {
                $query->withoutGlobalScope(\Illuminate\Database\Eloquent\SoftDeletingScope::class);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($sub) use ($search) {
                    $sub->where('invoice_number', 'like', "%{$search}%")
                        ->orWhereHas('customer', function($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%");
                        });
                });
            }

            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->filled('date_from') && $request->filled('date_to')) {
                $from = Carbon::parse($request->date_from)->startOfDay();
                $to = Carbon::parse($request->date_to)->endOfDay();
                $query->whereBetween('sale_date', [$from, $to]);
            }

            $invoices = $query->orderBy('sale_date', 'desc')->paginate($request->input('per_page', 10));

            return response()->json([
                'status' => 'success',
                'data' => $invoices
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Invoices index error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load invoices',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    public function showInvoice($id)
    {
        try {
            $query = Sale::with(['customer', 'user', 'items.product.category', 'items.product.brand']);
            if (!Schema::hasColumn('sales', 'deleted_at')) {
                $query->withoutGlobalScope(\Illuminate\Database\Eloquent\SoftDeletingScope::class);
            }
            $invoice = $query->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $invoice
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Show invoice error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to load invoice details.',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    public function refundInvoice(Request $request, $id)
    {
        $sale = Sale::with('items.product')->findOrFail($id);

        if ($sale->status === 'refunded') {
            return response()->json(['status' => 'error', 'message' => 'This invoice has already been refunded.'], 422);
        }

        DB::transaction(function() use ($sale, $request) {
            $sale->status = 'refunded';
            $sale->save();

            // Restock items
            foreach ($sale->items as $item) {
                $product = $item->product;
                
                // Restock size-wise if tracked
                $size = $item['size'] ?? null;
                if ($product->size_stock && $size && isset($product->size_stock[$size])) {
                    $sizeStock = $product->size_stock;
                    $sizeStock[$size] += $item['quantity'];
                    $product->size_stock = $sizeStock;
                    $product->save();
                }
                
                $product->increment('quantity', $item->quantity);

                // Inventory Adjustment log
                InventoryAdjustment::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => 'returned',
                    'quantity' => $item->quantity,
                    'reason' => "Refunded invoice (Invoice: {$sale->invoice_number})",
                ]);
            }

            // Deduct customer loyalty points
            if ($sale->customer_id) {
                $customer = Customer::find($sale->customer_id);
                if ($customer && $customer->id !== 1) {
                    $pointsDeducted = floor($sale->payable_amount / 10);
                    $customer->decrement('loyalty_points', min($customer->loyalty_points, $pointsDeducted));
                }
            }

            // Audit Log
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Invoice Refunded',
                'description' => "Refunded checkout for Invoice {$sale->invoice_number}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Invoice refunded successfully',
            'data' => $sale->fresh(['customer', 'user', 'items.product'])
        ]);
    }

    /**
     * Update invoice line items for authorized roles (Admin, Manager, Cashier)
     * Preserves invoice header metadata while updating line items, stock, and totals.
     */
    public function updateInvoiceItems(Request $request, $id)
    {
        // 1. RBAC check (Admin, Manager, Cashier allowed; Customers denied)
        $userRole = strtolower($request->user()->role ?? '');
        if (!in_array($userRole, ['admin', 'manager', 'cashier'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized access. Only Admins, Managers, and Cashiers are permitted to edit invoices.'
            ], 403);
        }

        // 2. Validate input parameters
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.original_price' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
        ]);

        $sale = Sale::with('items.product')->findOrFail($id);

        if ($sale->status === 'refunded') {
            return response()->json([
                'status' => 'error',
                'message' => 'Voided or refunded invoices cannot be modified.'
            ], 422);
        }

        try {
            $updatedSale = DB::transaction(function() use ($sale, $request) {
                // STEP 1: Restore inventory stock for previous line items
                foreach ($sale->items as $oldItem) {
                    $product = Product::find($oldItem->product_id);
                    if ($product) {
                        $size = $oldItem->size;
                        if ($product->size_stock && $size && isset($product->size_stock[$size])) {
                            $sizeStock = $product->size_stock;
                            $sizeStock[$size] += $oldItem->quantity;
                            $product->size_stock = $sizeStock;
                            $product->save();
                        }
                        $product->increment('quantity', $oldItem->quantity);

                        InventoryAdjustment::create([
                            'product_id' => $product->id,
                            'user_id' => $request->user()->id,
                            'type' => 'in',
                            'quantity' => $oldItem->quantity,
                            'reason' => "Stock restored for invoice line-item modification (Invoice: {$sale->invoice_number})",
                        ]);
                    }
                }

                // STEP 2: Validate stock availability for updated line items
                foreach ($request->items as $newItem) {
                    $product = Product::findOrFail($newItem['product_id']);
                    $size = $newItem['size'] ?? null;
                    if ($product->size_stock && $size && isset($product->size_stock[$size])) {
                        if ($product->size_stock[$size] < $newItem['quantity']) {
                            throw new \Exception("Insufficient stock for product '{$product->name}' (Size: {$size}). Current available stock is {$product->size_stock[$size]}.");
                        }
                    } else {
                        if ($product->quantity < $newItem['quantity']) {
                            throw new \Exception("Insufficient stock for product '{$product->name}'. Current available stock is {$product->quantity}.");
                        }
                    }
                }

                // STEP 3: Clear old items and recreate new line items
                $sale->items()->delete();

                $grossTotalAmount = 0;

                foreach ($request->items as $newItem) {
                    $product = Product::findOrFail($newItem['product_id']);
                    $size = $newItem['size'] ?? null;
                    $quantity = (int)$newItem['quantity'];
                    $unitPrice = (float)$newItem['unit_price'];
                    $discountPerUnit = (float)($newItem['discount'] ?? 0);
                    $taxPerUnit = (float)($newItem['tax'] ?? 0);

                    // Deduct stock
                    if ($product->size_stock && $size && isset($product->size_stock[$size])) {
                        $sizeStock = $product->size_stock;
                        $sizeStock[$size] -= $quantity;
                        $product->size_stock = $sizeStock;
                        $product->save();
                    }
                    $product->decrement('quantity', $quantity);

                    $subtotal = ($unitPrice - $discountPerUnit) * $quantity + $taxPerUnit;
                    $grossTotalAmount += ($unitPrice * $quantity);

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'discount' => $discountPerUnit * $quantity,
                        'tax' => $taxPerUnit,
                        'subtotal' => $subtotal,
                        'size' => $size,
                        'color' => $newItem['color'] ?? null,
                        'original_price' => $newItem['original_price'] ?? $product->selling_price,
                    ]);

                    InventoryAdjustment::create([
                        'product_id' => $product->id,
                        'user_id' => $request->user()->id,
                        'type' => 'out',
                        'quantity' => $quantity,
                        'reason' => "Stock deducted for invoice line-item modification (Invoice: {$sale->invoice_number})",
                    ]);
                }

                // STEP 4: Recalculate Subtotal, Tax, Discount & Grand Total on Sale Header
                $discountAmount = $request->has('discount_amount')
                    ? (float)$request->discount_amount
                    : (float)$sale->discount_amount;

                $taxAmount = $request->has('tax_amount')
                    ? (float)$request->tax_amount
                    : (float)$sale->tax_amount;

                $payableAmount = max(0, $grossTotalAmount - $discountAmount + $taxAmount);

                $sale->update([
                    'total_amount' => $grossTotalAmount,
                    'discount_amount' => $discountAmount,
                    'tax_amount' => $taxAmount,
                    'payable_amount' => $payableAmount,
                    'paid_amount' => $payableAmount,
                ]);

                // STEP 5: Audit Log
                AuditLog::create([
                    'user_id' => $request->user()->id,
                    'action' => 'Invoice Line Items Updated',
                    'description' => "Updated line items for Invoice {$sale->invoice_number}. New Payable Total: {$payableAmount}",
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);

                return $sale->fresh(['customer', 'user', 'items.product.category', 'items.product.brand']);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Invoice line items updated and totals recalculated successfully',
                'data' => $updatedSale
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Delete a refunded invoice record (soft delete)
     */
    public function destroyInvoice(Request $request, $id)
    {
        $user = $request->user();
        $userRole = strtolower($user->role ?? '');
        if (!in_array($userRole, ['admin', 'manager', 'cashier'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized access. Only Admins, Managers, and Cashiers are permitted to delete invoices.'
            ], 403);
        }

        $sale = Sale::findOrFail($id);

        if ($sale->status !== 'refunded') {
            return response()->json([
                'status' => 'error',
                'message' => 'Only refunded invoices can be deleted.'
            ], 422);
        }

        DB::transaction(function() use ($sale, $request) {
            $invoiceNumber = $sale->invoice_number;
            $sale->delete();

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Refunded Invoice Deleted',
                'description' => "Deleted refunded invoice record {$invoiceNumber}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Refunded invoice record deleted successfully'
        ]);
    }
}

