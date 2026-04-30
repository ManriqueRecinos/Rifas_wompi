<template>
  <div class="admin-page">
    <div class="admin-page__header">
      <h1 class="admin-page__title">📊 Dashboard</h1>
      <p class="admin-page__subtitle">Resumen del sistema de rifas</p>
    </div>

    <!-- Stats Cards -->
    <div v-if="statsLoading" class="stats-grid">
      <div v-for="i in 6" :key="i" class="stat-card stat-card--skeleton">
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--number"></div>
      </div>
    </div>

    <div v-else class="stats-grid">
      <div class="stat-card stat-card--purple">
        <div class="stat-card__icon">🎟️</div>
        <div class="stat-card__value">{{ stats?.total_raffles ?? 0 }}</div>
        <div class="stat-card__label">Total de rifas</div>
      </div>
      <div class="stat-card stat-card--green">
        <div class="stat-card__icon">🟢</div>
        <div class="stat-card__value">{{ stats?.active_raffles ?? 0 }}</div>
        <div class="stat-card__label">Rifas activas</div>
      </div>
      <div class="stat-card stat-card--blue">
        <div class="stat-card__icon">🏆</div>
        <div class="stat-card__value">{{ stats?.finished_raffles ?? 0 }}</div>
        <div class="stat-card__label">Rifas finalizadas</div>
      </div>
      <div class="stat-card stat-card--pink">
        <div class="stat-card__icon">🎫</div>
        <div class="stat-card__value">{{ stats?.total_tickets ?? 0 }}</div>
        <div class="stat-card__label">Tickets vendidos</div>
      </div>
      <div class="stat-card stat-card--gold">
        <div class="stat-card__icon">💰</div>
        <div class="stat-card__value">${{ formatAmount(stats?.total_revenue) }}</div>
        <div class="stat-card__label">Ingresos totales</div>
      </div>
      <div class="stat-card stat-card--teal">
        <div class="stat-card__icon">🏅</div>
        <div class="stat-card__value">{{ stats?.total_winners ?? 0 }}</div>
        <div class="stat-card__label">Ganadores</div>
      </div>
    </div>

    <!-- Recent Raffles -->
    <div class="admin-section">
      <div class="admin-section__header">
        <h2 class="admin-section__title">Rifas recientes</h2>
        <RouterLink to="/admin/rifas" class="btn btn--primary btn--sm">
          + Gestionar rifas
        </RouterLink>
      </div>

      <div v-if="raffleStore.loading" class="loading-center">
        <div class="spinner"></div>
      </div>

      <div v-else class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Rifa</th>
              <th>Precio</th>
              <th>Vendidos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="raffle in raffleStore.raffles" :key="raffle.id">
              <td>
                <div class="table-raffle-name">{{ raffle.name }}</div>
                <div class="table-raffle-prize">🏆 {{ raffle.prize }}</div>
              </td>
              <td>${{ formatAmount(raffle.ticket_price) }}</td>
              <td>
                <div class="table-progress">
                  <span>{{ raffle.sold_tickets }} / {{ raffle.total_tickets }}</span>
                  <div class="progress-bar progress-bar--sm">
                    <div
                      class="progress-bar__fill"
                      :style="{ width: pct(raffle) + '%' }"
                    ></div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" :class="`badge--${raffle.status}`">
                  {{ statusLabel(raffle.status) }}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <RouterLink :to="`/admin/rifas/${raffle.id}/tickets`" class="btn btn--ghost btn--xs">
                    Tickets
                  </RouterLink>
                  <RouterLink to="/admin/rifas" class="btn btn--ghost btn--xs">
                    Editar
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRaffleStore } from '@/stores/raffles';

const raffleStore  = useRaffleStore();
const stats        = ref(null);
const statsLoading = ref(true);

function formatAmount(v) { return Number(v || 0).toFixed(2); }
function pct(r) { return Math.min(100, Math.round((r.sold_tickets / r.total_tickets) * 100)); }
function statusLabel(s) {
  return { active: 'Activa', closed: 'Cerrada', finished: 'Finalizada' }[s] || s;
}

onMounted(async () => {
  try {
    stats.value = await raffleStore.fetchStats();
    await raffleStore.fetchRaffles();
  } finally {
    statsLoading.value = false;
  }
});
</script>
