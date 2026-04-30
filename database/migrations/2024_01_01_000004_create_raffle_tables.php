<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Participants - people who buy without account
        Schema::create('participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->string('email', 150);
            $table->string('phone', 20)->nullable();
            $table->timestamps();
        });

        // Sanctum personal access tokens
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // Raffles
        Schema::create('raffles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->text('prize');
            $table->string('prize_image')->nullable();
            $table->decimal('ticket_price', 10, 2);
            $table->integer('total_tickets');
            $table->integer('sold_tickets')->default(0);
            $table->timestampTz('start_date')->nullable();
            $table->timestampTz('end_date')->nullable();
            $table->string('status', 20)->default('active'); // active, closed, finished
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Tickets
        Schema::create('tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->foreignUuid('raffle_id')->constrained('raffles')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('participant_id')->nullable()->constrained('participants')->nullOnDelete();
            $table->string('payment_status', 20)->default('pending'); // pending, paid, failed
            $table->timestampTz('purchased_at')->useCurrent();
            $table->timestamps();
        });

        // Payments
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('method', 50)->nullable();
            $table->string('transaction_id')->nullable();
            $table->string('status', 20)->default('pending'); // pending, paid, failed
            $table->jsonb('wompi_response')->nullable();
            $table->string('hash')->nullable();
            $table->timestamps();
        });

        // Winners
        Schema::create('winners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('raffle_id')->unique()->constrained('raffles');
            $table->foreignUuid('ticket_id')->constrained('tickets');
            $table->timestampTz('selected_at')->useCurrent();
            $table->timestamps();
        });

        // Audit logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->string('model_type', 100)->nullable();
            $table->uuid('model_id')->nullable();
            $table->jsonb('data')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });

        // Indexes for performance
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS idx_tickets_raffle ON tickets(raffle_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_raffles_status ON raffles(status)');
            DB::statement('CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id)');

        // Trigger removed: logic moved to TicketService to ensure consistency between SQLite and PostgreSQL.
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS trg_ticket_limit ON tickets');
            DB::statement('DROP FUNCTION IF EXISTS check_ticket_limit');
        }
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('winners');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('raffles');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('participants');
    }
};
