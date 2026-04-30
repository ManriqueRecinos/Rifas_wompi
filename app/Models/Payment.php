<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'ticket_id',
        'amount',
        'method',
        'transaction_id',
        'status',
        'wompi_response',
        'hash',
    ];

    protected $casts = [
        'amount'          => 'decimal:2',
        'wompi_response'  => 'array',
    ];

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}
