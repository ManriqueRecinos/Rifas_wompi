<?php

return [
    'app_id'       => env('WOMPI_APP_ID'),
    'app_secret'   => env('WOMPI_APP_SECRET'),
    'base_url'     => env('WOMPI_BASE_URL', 'https://wompi.sv'),
    'payment_link' => env('WOMPI_PAYMENT_LINK', 'test-link'),
    'env'          => env('WOMPI_ENV', 'sandbox'),
];
