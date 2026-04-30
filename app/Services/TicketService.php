<?php

namespace App\Services;

use App\Models\Raffle;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Participant;
use App\Jobs\SendTicketEmail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TicketService
{
    public function __construct(private WompiService $wompiService) {}

    /**
     * Reserve a ticket and create pending payment
     */
    public function reserveTicket(Raffle $raffle, array $buyerData, ?User $user = null): array
    {
        if (!$raffle->isActive()) {
            throw new \Exception('Esta rifa no está activa.');
        }

        if ($raffle->availableTickets() <= 0) {
            throw new \Exception('No hay tickets disponibles.');
        }

        return DB::transaction(function () use ($raffle, $buyerData, $user) {
            // Get or create participant for guest buyers
            $participant = null;
            if (!$user) {
                $participant = Participant::firstOrCreate(
                    ['email' => $buyerData['email']],
                    [
                        'name'  => $buyerData['name'],
                        'phone' => $buyerData['phone'] ?? null,
                    ]
                );
            }

            $ticket = Ticket::create([
                'code'           => $this->generateUniqueCode($raffle),
                'raffle_id'      => $raffle->id,
                'user_id'        => $user?->id,
                'participant_id' => $participant?->id,
                'payment_status' => 'pending',
                'purchased_at'   => now(),
            ]);

            // Note: sold_tickets is NOT incremented here anymore. 
            // It will be incremented in confirmPayment() only when the payment is approved.
            // This prevents "pending" tickets from filling up the raffle count prematurely.

            // Create pending payment record
            $payment = $ticket->payment()->create([
                'amount' => $raffle->ticket_price,
                'status' => 'pending',
            ]);

            // Generate Wompi payment URL
            $paymentUrl = $this->wompiService->generatePaymentUrl(
                ticketId: $ticket->id,
                amount: $raffle->ticket_price,
                description: "Ticket #{$ticket->code} - {$raffle->name}",
                buyerEmail: $buyerData['email'],
                buyerName: $buyerData['name'],
            );

            Log::info('Ticket reserved', [
                'ticket_id' => $ticket->id,
                'raffle_id' => $raffle->id,
                'code'      => $ticket->code,
            ]);

            return [
                'ticket'      => $ticket->load(['raffle', 'user', 'participant']),
                'payment'     => $payment,
                'payment_url' => $paymentUrl,
            ];
        });
    }

    /**
     * Confirm ticket payment (called from webhook)
     */
    public function confirmPayment(string $transactionId, array $wompiData): void
    {
        // Find payment by transaction_id
        $payment = \App\Models\Payment::where('transaction_id', $transactionId)->first();

        if (!$payment) {
            Log::warning('Payment not found for transaction', ['transaction_id' => $transactionId]);
            return;
        }

        DB::transaction(function () use ($payment, $wompiData) {
            $isApproved = ($wompiData['esAprobada'] ?? false) === true
                || ($wompiData['esAprobada'] ?? '') === 'True';

            $payment->update([
                'status'         => $isApproved ? 'paid' : 'failed',
                'wompi_response' => $wompiData,
                'method'         => $wompiData['formaPago'] ?? null,
            ]);

            $payment->ticket->update([
                'payment_status' => $isApproved ? 'paid' : 'failed',
            ]);

            if ($isApproved) {
                // Increment the sold tickets counter only now that it's paid
                $payment->ticket->raffle->increment('sold_tickets');

                // Send ticket confirmation email
                SendTicketEmail::dispatch($payment->ticket->load(['raffle', 'user', 'participant']));
            }

            Log::info('Payment confirmed', [
                'ticket_id'      => $payment->ticket_id,
                'transaction_id' => $wompiData['idTransaccion'] ?? null,
                'status'         => $isApproved ? 'paid' : 'failed',
            ]);
        });
    }

    /**
     * Admin manual ticket creation (no payment)
     */
    public function createManualTicket(Raffle $raffle, array $buyerData): Ticket
    {
        if ($raffle->availableTickets() <= 0) {
            throw new \Exception('No hay tickets disponibles.');
        }

        return DB::transaction(function () use ($raffle, $buyerData) {
            $participant = Participant::firstOrCreate(
                ['email' => $buyerData['email']],
                [
                    'name'  => $buyerData['name'],
                    'phone' => $buyerData['phone'] ?? null,
                ]
            );

            $ticket = Ticket::create([
                'code'           => $this->generateUniqueCode($raffle),
                'raffle_id'      => $raffle->id,
                'participant_id' => $participant->id,
                'payment_status' => 'paid',
                'purchased_at'   => now(),
            ]);

            $raffle->increment('sold_tickets');

            $ticket->payment()->create([
                'amount' => $raffle->ticket_price,
                'status' => 'paid',
                'method' => 'manual',
            ]);

            SendTicketEmail::dispatch($ticket->load(['raffle', 'participant']));

            return $ticket;
        });
    }

    private function generateUniqueCode(Raffle $raffle): string
    {
        do {
            $code = strtoupper(Str::random(3)) . '-' . str_pad(
                $raffle->sold_tickets + 1,
                4,
                '0',
                STR_PAD_LEFT
            );
        } while (Ticket::where('code', $code)->exists());

        return $code;
    }
}
