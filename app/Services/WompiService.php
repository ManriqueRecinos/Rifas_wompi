<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class WompiService
{
    private string $appId;
    private string $appSecret;
    private string $baseUrl;
    private string $paymentLink;

    public function __construct()
    {
        $this->appId      = config('wompi.app_id');
        $this->appSecret  = config('wompi.app_secret');
        $this->baseUrl    = config('wompi.base_url');
        $this->paymentLink = config('wompi.payment_link');
    }

    /**
     * Generate Wompi payment URL using payment link
     * URL format: https://wompi.sv/?identificadorEnlaceComercio=test-link&...
     */
    public function generatePaymentUrl(
        string $ticketId,
        float $amount,
        string $description,
        string $buyerEmail,
        string $buyerName,
    ): string {
        $params = [
            'monto'       => number_format($amount, 2, '.', ''),
            'referencia'  => $ticketId,
            'descripcion' => $description,
            'email'       => $buyerEmail,
            'nombre'      => $buyerName,
        ];

        // Format for Enlace de Pago en pagos.wompi.sv with widget mode
        return "{$this->baseUrl}/EnlacePago/Identificador/{$this->paymentLink}?" . http_build_query($params) . "&esWidget=1";
    }

    /**
     * Validate webhook signature from Wompi
     * SHA-256 hash verification
     */
    public function validateWebhookHash(array $params): bool
    {
        $receivedHash = $params['hash'] ?? null;
        if (!$receivedHash) {
            return false;
        }

        // Build the string to hash (exclude hash param itself)
        $paramsToHash = $params;
        unset($paramsToHash['hash']);

        // Sort params alphabetically for consistent hashing
        ksort($paramsToHash);
        $stringToHash = implode('', array_values($paramsToHash)) . $this->appSecret;

        $computedHash = hash('sha256', $stringToHash);

        $valid = hash_equals($computedHash, $receivedHash);

        if (!$valid) {
            Log::warning('Wompi webhook hash validation failed', [
                'received' => $receivedHash,
                'computed' => $computedHash,
            ]);
        }

        return $valid;
    }

    /**
     * Validate webhook for normal payment redirect
     * URL format: https://wompi.sv/?idTransaccion=...&monto=...&esAprobada=...&hash=...
     */
    public function validateNormalPaymentHash(array $params): bool
    {
        $receivedHash = $params['hash'] ?? null;
        if (!$receivedHash) {
            return false;
        }

        // Wompi hash for normal payment: SHA-256(idTransaccion + monto + esReal + formaPago + esAprobada + codigoAutorizacion + mensaje + SECRET)
        $fields = [
            $params['idTransaccion']      ?? '',
            $params['monto']              ?? '',
            $params['esReal']             ?? '',
            $params['formaPago']          ?? '',
            $params['esAprobada']         ?? '',
            $params['codigoAutorizacion'] ?? '',
            $params['mensaje']            ?? '',
            $this->appSecret,
        ];

        $computedHash = hash('sha256', implode('', $fields));

        return hash_equals($computedHash, $receivedHash);
    }

    /**
     * Validate payment link webhook hash
     * URL format: https://wompi.sv/?identificadorEnlaceComercio=...&idTransaccion=...&idEnlace=...&monto=...&hash=...
     */
    public function validateLinkPaymentHash(array $params): bool
    {
        $receivedHash = $params['hash'] ?? null;
        if (!$receivedHash) {
            return false;
        }

        $fields = [
            $params['identificadorEnlaceComercio'] ?? '',
            $params['idTransaccion']               ?? '',
            $params['idEnlace']                    ?? '',
            $params['monto']                       ?? '',
            $this->appSecret,
        ];

        $computedHash = hash('sha256', implode('', $fields));

        return hash_equals($computedHash, $receivedHash);
    }
}
