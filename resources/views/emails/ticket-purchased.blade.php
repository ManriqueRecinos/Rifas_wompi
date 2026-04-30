<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tu ticket de rifa</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid rgba(139,92,246,0.3); border-radius: 20px; padding: 40px; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { font-size: 28px; background: linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .ticket-box { background: linear-gradient(135deg, #8b5cf6, #ec4899); border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; }
        .ticket-code { font-size: 36px; font-weight: 900; color: white; letter-spacing: 6px; font-family: 'Courier New', monospace; }
        .ticket-label { color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 10px; }
        .details { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #94a3b8; font-size: 14px; }
        .detail-value { color: #e2e8f0; font-weight: 600; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        .status-badge { display: inline-block; background: #10b981; color: white; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <h1>🎟️ Sistema de Rifas</h1>
                <p style="color: #94a3b8; margin: 5px 0 0;">Tu ticket ha sido confirmado</p>
            </div>

            <div class="ticket-box">
                <div class="ticket-label">Tu número de ticket</div>
                <div class="ticket-code">{{ $ticket->code }}</div>
                <div class="status-badge">✓ PAGADO</div>
            </div>

            <div class="details">
                <div class="detail-row">
                    <span class="detail-label">Rifa</span>
                    <span class="detail-value">{{ $ticket->raffle->name }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Premio</span>
                    <span class="detail-value">{{ $ticket->raffle->prize }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Monto pagado</span>
                    <span class="detail-value">${{ number_format($ticket->raffle->ticket_price, 2) }}</span>
                </div>
                @if($ticket->raffle->end_date)
                <div class="detail-row">
                    <span class="detail-label">Fecha del sorteo</span>
                    <span class="detail-value">{{ $ticket->raffle->end_date->format('d/m/Y') }}</span>
                </div>
                @endif
                <div class="detail-row">
                    <span class="detail-label">Comprador</span>
                    <span class="detail-value">{{ $ticket->buyer?->name ?? 'N/A' }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha de compra</span>
                    <span class="detail-value">{{ $ticket->purchased_at->format('d/m/Y H:i') }}</span>
                </div>
            </div>

            <p style="color: #94a3b8; font-size: 14px; text-align: center;">
                Guarda este correo como comprobante. ¡Mucha suerte en el sorteo! 🍀
            </p>

            <div class="footer">
                <p>Sistema de Rifas | Este es un correo automático, no respondas a este mensaje.</p>
            </div>
        </div>
    </div>
</body>
</html>
