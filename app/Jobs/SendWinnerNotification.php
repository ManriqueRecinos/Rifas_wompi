<?php

namespace App\Jobs;

use App\Models\Winner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use App\Mail\WinnerNotification;

class SendWinnerNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public Winner $winner) {}

    public function handle(): void
    {
        $ticket = $this->winner->ticket;
        $buyer  = $ticket->user ?? $ticket->participant;

        if (!$buyer || !$buyer->email) {
            return;
        }

        Mail::to($buyer->email)->send(new WinnerNotification($this->winner));
    }
}
