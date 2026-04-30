<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Raffle extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'prize',
        'prize_image',
        'ticket_price',
        'total_tickets',
        'sold_tickets',
        'start_date',
        'end_date',
        'status',
        'created_by',
    ];

    protected $casts = [
        'ticket_price' => 'decimal:2',
        'start_date'   => 'datetime',
        'end_date'     => 'datetime',
        'sold_tickets' => 'integer',
        'total_tickets' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function winner()
    {
        return $this->hasOne(Winner::class);
    }

    public function availableTickets(): int
    {
        return $this->total_tickets - $this->sold_tickets;
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function totalRevenue(): float
    {
        return $this->tickets()->whereHas('payment', function ($q) {
            $q->where('status', 'paid');
        })->count() * $this->ticket_price;
    }
}
