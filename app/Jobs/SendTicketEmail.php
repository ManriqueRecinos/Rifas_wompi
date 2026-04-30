<?php

namespace App\Jobs;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use App\Mail\TicketPurchased;

class SendTicketEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public Ticket $ticket) {}

    public function handle(): void
    {
        $buyer = $this->ticket->user ?? $this->ticket->participant;

        if (!$buyer || !$buyer->email) {
            return;
        }

        Mail::to($buyer->email)->send(new TicketPurchased($this->ticket));
    }

    public function failed(\Throwable $exception): void
    {
        \Illuminate\Support\Facades\Log::error('SendTicketEmail job failed', [
            'ticket_id' => $this->ticket->id,
            'error'     => $exception->getMessage(),
        ]);
    }
}
