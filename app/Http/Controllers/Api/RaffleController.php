<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Raffle;
use App\Services\RaffleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RaffleController extends Controller
{
    public function __construct(private RaffleService $raffleService) {}

    /**
     * GET /api/raffles - Public list of active raffles
     */
    public function index(Request $request): JsonResponse
    {
        $query = Raffle::withCount(['tickets as paid_tickets_count' => function ($q) {
            $q->where('payment_status', 'paid');
        }])->with('winner.ticket');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            $query->whereIn('status', ['active', 'closed']);
        }

        $raffles = $query->orderBy('created_at', 'desc')->paginate(12);

        return response()->json($raffles);
    }

    /**
     * GET /api/raffles/{id} - Single raffle detail
     */
    public function show(Raffle $raffle): JsonResponse
    {
        $raffle->load(['winner.ticket.user', 'winner.ticket.participant']);
        $raffle->loadCount(['tickets as paid_tickets_count' => function ($q) {
            $q->where('payment_status', 'paid');
        }]);

        return response()->json($raffle);
    }

    /**
     * POST /api/raffles - Create raffle (admin)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:150',
            'description'   => 'nullable|string',
            'prize'         => 'required|string',
            'ticket_price'  => 'required|numeric|min:0.01',
            'total_tickets' => 'required|integer|min:1',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date|after:start_date',
        ]);

        $raffle = $this->raffleService->create($data, $request->user()->id);

        return response()->json($raffle, 201);
    }

    /**
     * PUT /api/raffles/{id} - Update raffle (admin)
     */
    public function update(Request $request, Raffle $raffle): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'sometimes|string|max:150',
            'description'   => 'nullable|string',
            'prize'         => 'sometimes|string',
            'ticket_price'  => 'sometimes|numeric|min:0.01',
            'total_tickets' => 'sometimes|integer|min:1',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date',
            'status'        => 'sometimes|in:active,closed,finished',
        ]);

        $raffle->update($data);

        return response()->json($raffle->fresh());
    }

    /**
     * DELETE /api/raffles/{id} - Soft delete raffle (admin)
     */
    public function destroy(Raffle $raffle): JsonResponse
    {
        if ($raffle->sold_tickets > 0) {
            return response()->json([
                'message' => 'No se puede eliminar una rifa con tickets vendidos.',
            ], 422);
        }

        $raffle->delete();

        return response()->json(['message' => 'Rifa eliminada correctamente.']);
    }

    /**
     * POST /api/raffles/{id}/draw - Draw winner (admin)
     */
    public function draw(Raffle $raffle): JsonResponse
    {
        try {
            $winner = $this->raffleService->drawWinner($raffle);
            $winner->load(['ticket.user', 'ticket.participant', 'raffle']);

            return response()->json([
                'message' => '¡Ganador seleccionado exitosamente!',
                'winner'  => $winner,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/admin/stats - Admin dashboard stats
     */
    public function stats(): JsonResponse
    {
        return response()->json($this->raffleService->getAdminStats());
    }
}
