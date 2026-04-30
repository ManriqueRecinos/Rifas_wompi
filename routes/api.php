<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RaffleController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Sistema de Rifas
|--------------------------------------------------------------------------
*/

// ─── Public Routes ─────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

// Public raffle listing
Route::get('/raffles',          [RaffleController::class, 'index']);
Route::get('/raffles/{raffle}', [RaffleController::class, 'show']);

// Buy ticket (public - no auth required)
Route::post('/tickets/buy', [TicketController::class, 'buy']);

// Wompi webhook (no auth - called by payment gateway)
Route::post('/payments/webhook',  [TicketController::class, 'webhook']);
Route::get('/payments/webhook',   [TicketController::class, 'webhook']); // Wompi uses GET redirects too
Route::get('/payments/verify',    [TicketController::class, 'verifyPayment']);

// ─── Authenticated Routes ───────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('/me',       [AuthController::class, 'me']);
        Route::post('/logout',  [AuthController::class, 'logout']);
        Route::put('/profile',  [AuthController::class, 'updateProfile']);
    });

    // User: my tickets
    Route::get('/my-tickets',       [TicketController::class, 'myTickets']);
    Route::get('/tickets/{ticket}', [TicketController::class, 'show']);

    // ─── Admin Routes ─────────────────────────────────────────────────────
    Route::middleware('admin')->group(function () {
        // Raffle management
        Route::post('/raffles',                    [RaffleController::class, 'store']);
        Route::put('/raffles/{raffle}',            [RaffleController::class, 'update']);
        Route::delete('/raffles/{raffle}',         [RaffleController::class, 'destroy']);
        Route::post('/raffles/{raffle}/draw',      [RaffleController::class, 'draw']);
        Route::get('/raffles/{raffle}/tickets',    [TicketController::class, 'raffleTickets']);

        // Admin dashboard stats
        Route::get('/admin/stats', [RaffleController::class, 'stats']);

        // Manual ticket creation
        Route::post('/tickets/manual', [TicketController::class, 'manual']);
    });
});
