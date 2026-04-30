<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'raffle_id',
        'user_id',
        'participant_id',
        'payment_status',
        'purchased_at',
    ];

    protected $casts = [
        'purchased_at' => 'datetime',
    ];

    public function raffle()
    {
        return $this->belongsTo(Raffle::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function participant()
    {
        return $this->belongsTo(Participant::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    public function winner()
    {
        return $this->hasOne(Winner::class);
    }

    /**
     * Get buyer info regardless of whether it's a user or participant
     */
    public function getBuyerAttribute()
    {
        return $this->user ?? $this->participant;
    }
}
