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
        $query = Sale::with(['customer', 'user']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
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
    }

    public function showInvoice($id)
    {
        $invoice = Sale::with(['customer', 'user', 'items.product.category', 'items.product.brand'])->findOrFail($id);
        return response()->json([
            'status' => 'success',
            'data' => $invoice
        ]);
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
}
