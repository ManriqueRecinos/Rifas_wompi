<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Ganaste!</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid rgba(251,191,36,0.5); border-radius: 20px; padding: 40px; }
        .trophy { text-align: center; font-size: 80px; margin-bottom: 20px; }
        .title { text-align: center; font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 10px; }
        .subtitle { text-align: center; color: #94a3b8; font-size: 16px; margin-bottom: 30px; }
        .winner-box { background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 16px; padding: 30px; text-align: center; margin: 20px 0; }
        .winner-name { font-size: 28px; font-weight: 900; color: #1a1a2e; }
        .winner-ticket { font-size: 18px; color: rgba(26,26,46,0.8); font-family: 'Courier New', monospace; margin-top: 8px; }
        .prize-box { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .prize-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; }
        .prize-value { font-size: 24px; font-weight: 800; color: #fbbf24; margin-top: 8px; }
        .details { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #94a3b8; font-size: 14px; }
        .detail-value { color: #e2e8f0; font-weight: 600; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="trophy">🏆</div>
            <h1 class="title">¡FELICITACIONES!</h1>
            <p class="subtitle">Eres el ganador de la rifa <strong style="color: #fbbf24;">{{ $winner->raffle->name }}</strong></p>

            <div class="winner-box">
                <div class="winner-name">{{ $winner->ticket->buyer?->name ?? 'Ganador' }}</div>
                <div class="winner-ticket">Ticket: {{ $winner->ticket->code }}</div>
            </div>

            <div class="prize-box">
                <div class="prize-label">🎁 Tu Premio</div>
                <div class="prize-value">{{ $winner->raffle->prize }}</div>
            </div>

            <div class="details">
                <div class="detail-row">
                    <span class="detail-label">Rifa</span>
                    <span class="detail-value">{{ $winner->raffle->name }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Número de ticket</span>
                    <span class="detail-value">{{ $winner->ticket->code }}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha del sorteo</span>
                    <span class="detail-value">{{ $winner->selected_at->format('d/m/Y H:i') }}</span>
                </div>
            </div>

            <p style="color: #94a3b8; font-size: 14px; text-align: center;">
                El equipo de administración se pondrá en contacto contigo para coordinar la entrega de tu premio. 🎉
            </p>

            <div class="footer">
                <p>Sistema de Rifas | ¡Gracias por participar!</p>
            </div>
        </div>
    </div>
</body>
</html>
