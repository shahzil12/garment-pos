<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\VendorPayment;
use App\Models\Product;
use App\Models\InventoryAdjustment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VendorController extends Controller
{
    // ==========================================
    // Vendor CRUD
    // ==========================================
    public function indexVendors(Request $request)
    {
        $query = Vendor::withCount('purchaseOrders');
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json(['status' => 'success', 'data' => $query->get()]);
    }

    public function storeVendor(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $vendor = Vendor::create($request->all());

        return response()->json(['status' => 'success', 'message' => 'Vendor created successfully', 'data' => $vendor], 201);
    }

    public function updateVendor(Request $request, $id)
    {
        $vendor = Vendor::findOrFail($id);
        $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $vendor->update($request->all());
        return response()->json(['status' => 'success', 'message' => 'Vendor updated successfully', 'data' => $vendor]);
    }

    public function destroyVendor($id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->delete();
        return response()->json(['status' => 'success', 'message' => 'Vendor deleted successfully']);
    }

    // ==========================================
    // Purchase Orders (POs)
    // ==========================================
    public function indexPurchaseOrders(Request $request)
    {
        $query = PurchaseOrder::with(['vendor', 'items.product']);

        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->vendor_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->orderBy('order_date', 'desc')->paginate($request->input('per_page', 10));

        return response()->json(['status' => 'success', 'data' => $orders]);
    }

    public function storePurchaseOrder(Request $request)
    {
        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'order_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $totalAmount = 0;
        foreach ($request->items as $item) {
            $totalAmount += $item['quantity'] * $item['unit_price'];
        }

        $order = DB::transaction(function() use ($request, $totalAmount) {
            $po = PurchaseOrder::create([
                'vendor_id' => $request->vendor_id,
                'order_date' => $request->order_date,
                'status' => 'pending', // pending -> ordered -> received
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'payment_status' => 'unpaid',
            ]);

            foreach ($request->items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                ]);
            }

            // Audit
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Purchase Order Drafted',
                'description' => "Drafted PO #{$po->id} for Vendor ID {$request->vendor_id} (Total: {$totalAmount})",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $po;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase order created successfully',
            'data' => $order->load(['vendor', 'items.product'])
        ], 201);
    }

    public function updatePOStatus(Request $request, $id)
    {
        $po = PurchaseOrder::with('items.product')->findOrFail($id);
        
        $request->validate([
            'status' => 'required|in:pending,ordered,received,cancelled',
        ]);

        $oldStatus = $po->status;
        $newStatus = $request->status;

        if ($oldStatus === 'received') {
            return response()->json(['status' => 'error', 'message' => 'Cannot change status of a received order.'], 422);
        }

        DB::transaction(function() use ($po, $newStatus, $request) {
            $po->status = $newStatus;
            $po->save();

            // If received, increment product stock!
            if ($newStatus === 'received') {
                foreach ($po->items as $item) {
                    $product = $item->product;
                    $product->increment('quantity', $item->quantity);

                    // Add to Inventory Adjustments logs
                    InventoryAdjustment::create([
                        'product_id' => $product->id,
                        'user_id' => $request->user()->id,
                        'type' => 'in',
                        'quantity' => $item->quantity,
                        'reason' => "Received from Purchase Order #{$po->id}",
                    ]);
                }
            }

            // Audit
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'PO Status Updated',
                'description' => "Updated PO #{$po->id} status from {$po->status} to {$newStatus}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        });

        return response()->json(['status' => 'success', 'message' => 'Status updated successfully', 'data' => $po->fresh(['vendor', 'items.product'])]);
    }

    // ==========================================
    // Payments
    // ==========================================
    public function storeVendorPayment(Request $request)
    {
        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string',
            'note' => 'nullable|string|max:255',
        ]);

        DB::transaction(function() use ($request) {
            // Log Payment
            VendorPayment::create($request->all());

            // If attached to a Purchase Order, update it
            if ($request->purchase_order_id) {
                $po = PurchaseOrder::findOrFail($request->purchase_order_id);
                $po->increment('paid_amount', $request->amount);
                
                if ($po->paid_amount >= $po->total_amount) {
                    $po->payment_status = 'paid';
                } elseif ($po->paid_amount > 0) {
                    $po->payment_status = 'partial';
                } else {
                    $po->payment_status = 'unpaid';
                }
                $po->save();
            }

            // Audit
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Vendor Payment Recorded',
                'description' => "Paid vendor ID {$request->vendor_id} amount: {$request->amount}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        });

        return response()->json(['status' => 'success', 'message' => 'Vendor payment recorded successfully']);
    }
}
