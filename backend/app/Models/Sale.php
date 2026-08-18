<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Schema;

class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted()
    {
        static::addGlobalScope('safe_soft_deletes', function ($builder) {
            if (!Schema::hasColumn('sales', 'deleted_at')) {
                $builder->withoutGlobalScope(SoftDeletingScope::class);
            }
        });
    }

    protected $fillable = [
        'customer_id',
        'user_id',
        'invoice_number',
        'sale_date',
        'total_amount',
        'discount_amount',
        'tax_amount',
        'payable_amount',
        'paid_amount',
        'payment_method',
        'status',
        'notes',
    ];

    protected $casts = [
        'sale_date' => 'datetime',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'payable_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }
}

