<?php

namespace App\Services;

use App\Models\Raffle;
use App\Models\Ticket;
use App\Models\Winner;
use App\Jobs\SendWinnerNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RaffleService
{
    /**
     * Create a new raffle
     */
    public function create(array $data, string $adminId): Raffle
    {
        return Raffle::create([
            ...$data,
            'created_by' => $adminId,
        ]);
    }

    /**
     * Draw a winner randomly from paid tickets
     */
    public function drawWinner(Raffle $raffle): Winner
    {
        if ($raffle->winner) {
            throw new \Exception('Esta rifa ya tiene un ganador seleccionado.');
        }

        $paidTickets = Ticket::where('raffle_id', $raffle->id)
            ->where('payment_status', 'paid')
            ->get();

        if ($paidTickets->isEmpty()) {
            throw new \Exception('No hay tickets pagados para realizar el sorteo.');
        }

        return DB::transaction(function () use ($raffle, $paidTickets) {
            $winnerTicket = $paidTickets->random();

            $winner = Winner::create([
                'raffle_id'   => $raffle->id,
                'ticket_id'   => $winnerTicket->id,
                'selected_at' => now(),
            ]);

            $raffle->update(['status' => 'finished']);

            // Send notification via queue
            SendWinnerNotification::dispatch($winner->load(['ticket.user', 'ticket.participant', 'raffle']));

            Log::info('Raffle winner selected', [
                'raffle_id' => $raffle->id,
                'ticket_id' => $winnerTicket->id,
                'code'      => $winnerTicket->code,
            ]);

            return $winner;
        });
    }

    /**
     * Get dashboard stats for admin
     */
    public function getAdminStats(): array
    {
        return [
            'total_raffles'    => Raffle::count(),
            'active_raffles'   => Raffle::where('status', 'active')->count(),
            'finished_raffles' => Raffle::where('status', 'finished')->count(),
            'total_tickets'    => Ticket::where('payment_status', 'paid')->count(),
            'total_revenue'    => \App\Models\Payment::where('status', 'paid')->sum('amount'),
            'total_winners'    => Winner::count(),
        ];
    }
}
