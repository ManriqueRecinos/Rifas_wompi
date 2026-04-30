<?php

use Illuminate\Support\Facades\Route;

// Serve Vue SPA for all non-API routes
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '^(?!api).*');
