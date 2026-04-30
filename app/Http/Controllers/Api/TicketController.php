<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Raffle;
use App\Models\Ticket;
use App\Services\TicketService;
use App\Services\WompiService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class TicketController extends Controller
{
    public function __construct(
        private TicketService $ticketService,
        private WompiService $wompiService,
    ) {}

    /**
     * POST /api/tickets/buy - Buy a ticket (with or without auth)
     */
    public function buy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'raffle_id' => 'required|uuid|exists:raffles,id',
            'name'      => 'required|string|max:100',
            'email'     => 'required|email',
            'phone'     => 'nullable|string|max:20',
        ]);

        $raffle = Raffle::findOrFail($data['raffle_id']);

        try {
            $result = $this->ticketService->reserveTicket(
                raffle: $raffle,
                buyerData: $data,
                user: $request->user(),
            );

            return response()->json([
                'message'     => 'Ticket reservado. Completa el pago para confirmar.',
                'ticket'      => $result['ticket'],
                'payment_url' => $result['payment_url'],
                'wompi_config' => [
                    'appId'      => config('wompi.app_id'),
                    'monto'      => (float)$raffle->ticket_price,
                    'referencia' => $result['ticket']->id,
                    'nombre'     => $data['name'],
                    'email'      => $data['email'],
                    'descripcion' => "Ticket #{$result['ticket']->code} - {$raffle->name}",
                    'urlRedirect' => url('/payment/confirmation?ticket_id=' . $result['ticket']->id),
                    'esReal'      => config('wompi.env') === 'production',
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /api/tickets/manual - Admin creates ticket manually
     */
    public function manual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'raffle_id' => 'required|uuid|exists:raffles,id',
            'name'      => 'required|string|max:100',
            'email'     => 'required|email',
            'phone'     => 'nullable|string|max:20',
        ]);

        $raffle = Raffle::findOrFail($data['raffle_id']);

        try {
            $ticket = $this->ticketService->createManualTicket($raffle, $data);
            $ticket->load(['raffle', 'participant']);

            return response()->json([
                'message' => 'Ticket creado manualmente.',
                'ticket'  => $ticket,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/my-tickets - Authenticated user tickets
     */
    public function myTickets(Request $request): JsonResponse
    {
        $tickets = Ticket::where('user_id', $request->user()->id)
            ->with(['raffle', 'payment', 'raffle.winner'])
            ->orderBy('purchased_at', 'desc')
            ->paginate(20);

        return response()->json($tickets);
    }

    /**
     * GET /api/tickets/{id} - Ticket detail
     */
    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['raffle', 'user', 'participant', 'payment']);

        return response()->json($ticket);
    }

    /**
     * GET /api/raffles/{raffle}/tickets - Admin: all tickets for a raffle
     */
    public function raffleTickets(Raffle $raffle): JsonResponse
    {
        $tickets = $raffle->tickets()
            ->with(['user', 'participant', 'payment'])
            ->orderBy('purchased_at', 'desc')
            ->paginate(50);

        return response()->json($tickets);
    }

    /**
     * POST /api/payments/webhook - Wompi payment webhook/redirect handler
     */
    public function webhook(Request $request): JsonResponse
    {
        $params = $request->all();

        Log::info('Wompi webhook received', $params);

        // Detect type of Wompi payment (link vs normal)
        $isLinkPayment = isset($params['identificadorEnlaceComercio']);

        if ($isLinkPayment) {
            if (!$this->wompiService->validateLinkPaymentHash($params)) {
                return response()->json(['message' => 'Hash inválido'], 401);
            }
        } else {
            if (!$this->wompiService->validateNormalPaymentHash($params)) {
                return response()->json(['message' => 'Hash inválido'], 401);
            }
        }

        $transactionId = $params['idTransaccion'] ?? null;
        if (!$transactionId) {
            return response()->json(['message' => 'Transaction ID missing'], 400);
        }

        // Find payment by reference (ticket_id stored as referencia)
        $ticketId = $params['referencia'] ?? null;

        if ($ticketId) {
            $payment = \App\Models\Payment::whereHas('ticket', fn($q) => $q->where('id', $ticketId))->first();
        } else {
            $payment = \App\Models\Payment::where('transaction_id', $transactionId)->first();
        }

        if ($payment) {
            $payment->update(['transaction_id' => $transactionId]);
        }

        $this->ticketService->confirmPayment($transactionId, $params);

        return response()->json(['message' => 'OK']);
    }

    /**
     * GET /api/payments/verify - Verify payment status by ticket
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        $request->validate(['ticket_id' => 'required|uuid|exists:tickets,id']);

        $ticket = Ticket::with(['payment', 'raffle'])->findOrFail($request->ticket_id);

        return response()->json([
            'ticket'         => $ticket,
            'payment_status' => $ticket->payment_status,
            'paid'           => $ticket->payment_status === 'paid',
        ]);
    }
}
