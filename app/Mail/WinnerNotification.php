<?php

namespace App\Mail;

use App\Models\Winner;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WinnerNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Winner $winner) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🏆 ¡GANASTE la rifa: {$this->winner->raffle->name}!",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.winner-notification',
        );
    }
}
