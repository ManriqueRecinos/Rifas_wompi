<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Winner extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'raffle_id',
        'ticket_id',
        'selected_at',
    ];

    protected $casts = [
        'selected_at' => 'datetime',
    ];

    public function raffle()
    {
        return $this->belongsTo(Raffle::class);
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}
