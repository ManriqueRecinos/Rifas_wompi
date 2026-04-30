<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Raffle;
use App\Models\Ticket;
use App\Models\Participant;
use App\Models\Payment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        $admin = User::create([
            'name'     => 'Administrador',
            'email'    => 'admin@rifas.com',
            'phone'    => '+503 7000-0000',
            'password' => Hash::make('password'),
            'role'     => 'admin',
        ]);

        // Regular user
        $user = User::create([
            'name'     => 'Juan Pérez',
            'email'    => 'juan@example.com',
            'phone'    => '+503 7111-2222',
            'password' => Hash::make('password'),
            'role'     => 'user',
        ]);

        // Sample raffles
        $raffles = [
            [
                'name'          => 'iPhone 16 Pro Max',
                'description'   => '¡Llévate el iPhone más nuevo del mercado! 512GB, Titanio Negro. Incluye cargador y accesorios originales.',
                'prize'         => 'iPhone 16 Pro Max 512GB',
                'ticket_price'  => 5.00,
                'total_tickets' => 200,
                'status'        => 'active',
                'start_date'    => now(),
                'end_date'      => now()->addDays(30),
                'created_by'    => $admin->id,
            ],
            [
                'name'          => 'MacBook Air M3',
                'description'   => 'La laptop más potente y ligera de Apple. 16GB RAM, 512GB SSD. Perfecta para trabajo y estudio.',
                'prize'         => 'MacBook Air M3 16GB/512GB',
                'ticket_price'  => 10.00,
                'total_tickets' => 150,
                'status'        => 'active',
                'start_date'    => now(),
                'end_date'      => now()->addDays(45),
                'created_by'    => $admin->id,
            ],
            [
                'name'          => 'PlayStation 5 Bundle',
                'description'   => 'PS5 con 2 controles DualSense y 3 juegos incluidos. La experiencia gaming definitiva.',
                'prize'         => 'PS5 + 2 DualSense + 3 Juegos',
                'ticket_price'  => 3.00,
                'total_tickets' => 300,
                'status'        => 'active',
                'start_date'    => now(),
                'end_date'      => now()->addDays(20),
                'created_by'    => $admin->id,
            ],
            [
                'name'          => 'Viaje a Cancún',
                'description'   => '5 días y 4 noches todo incluido para 2 personas en un resort 5 estrellas en Cancún.',
                'prize'         => 'Viaje a Cancún Todo Incluido (2 personas)',
                'ticket_price'  => 25.00,
                'total_tickets' => 100,
                'status'        => 'active',
                'start_date'    => now(),
                'end_date'      => now()->addDays(60),
                'created_by'    => $admin->id,
            ],
            [
                'name'          => 'Tesla Model 3',
                'description'   => 'Rifa especial: gana un Tesla Model 3 Standard Range. El auto eléctrico más vendido del mundo.',
                'prize'         => 'Tesla Model 3 2024',
                'ticket_price'  => 100.00,
                'total_tickets' => 500,
                'status'        => 'active',
                'start_date'    => now(),
                'end_date'      => now()->addDays(90),
                'created_by'    => $admin->id,
            ],
        ];

        foreach ($raffles as $raffleData) {
            Raffle::create($raffleData);
        }

        $this->command->info('✅ Seeder completado exitosamente.');
        $this->command->info('👤 Admin: admin@rifas.com / password');
        $this->command->info('👤 User:  juan@example.com / password');
    }
}
