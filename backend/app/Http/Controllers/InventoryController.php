<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\InventoryAdjustment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function indexAdjustments(Request $request)
    {
        $query = InventoryAdjustment::with(['product', 'user']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('product', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $adjustments = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 10));

        return response()->json([
            'status' => 'success',
            'data' => $adjustments
        ]);
    }

    public function storeAdjustment(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'type' => 'required|in:in,out,adjustment,damaged,returned',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:255',
        ]);

        $product = Product::findOrFail($request->product_id);
        $qtyChange = (int) $request->quantity;

        // DB Transaction
        DB::transaction(function() use ($request, $product, $qtyChange) {
            $adjustmentType = $request->type;
            
            // Adjust product quantity based on adjustment type
            if (in_array($adjustmentType, ['in', 'returned'])) {
                $product->increment('quantity', $qtyChange);
            } elseif (in_array($adjustmentType, ['out', 'damaged'])) {
                if ($product->quantity < $qtyChange) {
                    throw new \Exception("Insufficient stock. Current stock is {$product->quantity}.");
                }
                $product->decrement('quantity', $qtyChange);
            } elseif ($adjustmentType === 'adjustment') {
                // If it is custom manual adjustment, we treat the reason to describe if it's positive or negative.
                // For simplicity, we can let user input a positive/negative quantity or have separate positive adjustment.
                // Let's assume quantity in this store endpoint is positive, but we can pass positive or negative values
                // if we relax the validation. Let's make this endpoint simple: it increments stock by default for 'in',
                // but let's allow custom override via direct set or adjust. Let's treat 'adjustment' as positive increment by default.
                $product->increment('quantity', $qtyChange);
            }

            // Save history
            InventoryAdjustment::create([
                'product_id' => $request->product_id,
                'user_id' => $request->user()->id,
                'type' => $request->type,
                'quantity' => $qtyChange,
                'reason' => $request->reason,
            ]);

            // Audit Log
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Stock Adjustment',
                'description' => "Adjusted stock for {$product->name} (Type: {$request->type}, Qty: {$qtyChange})",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Inventory adjustment saved successfully',
            'data' => $product->fresh()
        ]);
    }

    public function getLowStockAlerts()
    {
        $alerts = Product::with(['category', 'brand'])
            ->whereRaw('quantity <= low_stock_warning')
            ->orderBy('quantity', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $alerts
        ]);
    }
}
