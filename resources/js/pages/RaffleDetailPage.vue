<template>
  <div class="raffle-detail">
    <div v-if="loading" class="loading-fullpage">
      <div class="spinner spinner--lg"></div>
    </div>

    <template v-else-if="raffle">
      <!-- Back button -->
      <div class="detail__back">
        <button class="btn btn--ghost btn--sm" @click="$router.back()">← Volver</button>
      </div>

      <div class="detail__grid">
        <!-- Left: Info -->
        <div class="detail__main">
          <div class="detail__image">
            <span class="detail__emoji">{{ prizeEmoji }}</span>
          </div>

          <div class="detail__status-row">
            <span class="badge" :class="`badge--${raffle.status}`">
              {{ statusLabel }}
            </span>
            <span v-if="raffle.end_date" class="detail__date">
              📅 Sorteo: {{ formatDate(raffle.end_date) }}
            </span>
          </div>

          <h1 class="detail__title">{{ raffle.name }}</h1>
          <p class="detail__prize">🏆 Premio: <strong>{{ raffle.prize }}</strong></p>
          <p v-if="raffle.description" class="detail__desc">{{ raffle.description }}</p>

          <!-- Progress -->
          <div class="detail__progress-card">
            <div class="detail__progress-header">
              <span>Tickets vendidos</span>
              <span class="detail__progress-count">
                <strong>{{ raffle.sold_tickets }}</strong> / {{ raffle.total_tickets }}
              </span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <div class="detail__progress-pct">{{ progressPercent }}% completado</div>
          </div>

          <!-- Winner announcement -->
          <div v-if="raffle.winner" class="winner-banner">
            <div class="winner-banner__trophy">🏆</div>
            <div class="winner-banner__content">
              <h3>¡Ganador del sorteo!</h3>
              <p class="winner-banner__name">{{ raffle.winner.ticket?.user?.name || raffle.winner.ticket?.participant?.name }}</p>
              <p class="winner-banner__ticket">Ticket: {{ raffle.winner.ticket?.code }}</p>
            </div>
          </div>
        </div>

        <!-- Right: Purchase card -->
        <div class="detail__sidebar">
          <div class="purchase-card">
            <div class="purchase-card__header">
              <span class="purchase-card__label">Precio por ticket</span>
              <span class="purchase-card__price">${{ formatPrice(raffle.ticket_price) }}</span>
            </div>

            <div class="purchase-card__info">
              <div class="purchase-card__row">
                <span>Disponibles</span>
                <strong>{{ available }}</strong>
              </div>
              <div class="purchase-card__row">
                <span>Total tickets</span>
                <strong>{{ raffle.total_tickets }}</strong>
              </div>
            </div>

            <button
              v-if="raffle.status === 'active' && available > 0"
              class="btn btn--primary btn--full btn--lg"
              @click="showModal = true"
            >
              🎟️ Comprar Ticket Ahora
            </button>

            <div v-else-if="available === 0" class="purchase-card__sold-out">
              😔 Tickets agotados
            </div>

            <div v-else class="purchase-card__closed">
              Esta rifa ya no está activa
            </div>

            <p class="purchase-card__secure">
              🔒 Pago seguro con <strong>Wompi</strong>
            </p>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-state__icon">❌</div>
      <h2>Rifa no encontrada</h2>
      <RouterLink to="/" class="btn btn--primary">Volver al inicio</RouterLink>
    </div>

    <BuyTicketModal
      :show="showModal"
      :raffle="raffle"
      @close="showModal = false"
      @success="showModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useRaffleStore } from '@/stores/raffles';
import BuyTicketModal from '@/components/BuyTicketModal.vue';

const route = useRoute();
const raffleStore = useRaffleStore();
const loading  = ref(true);
const raffle   = ref(null);
const showModal = ref(false);

const progressPercent = computed(() => {
  if (!raffle.value?.total_tickets) return 0;
  return Math.min(100, Math.round((raffle.value.sold_tickets / raffle.value.total_tickets) * 100));
});

const available = computed(() =>
  (raffle.value?.total_tickets || 0) - (raffle.value?.sold_tickets || 0)
);

const statusLabel = computed(() => ({
  active:   '🟢 Activa',
  closed:   '🟡 Cerrada',
  finished: '🏆 Finalizada',
}[raffle.value?.status] || ''));

const prizeEmoji = computed(() => {
  const prize = raffle.value?.prize?.toLowerCase() || '';
  if (prize.includes('iphone') || prize.includes('apple')) return '📱';
  if (prize.includes('mac') || prize.includes('laptop')) return '💻';
  if (prize.includes('ps5') || prize.includes('playstation')) return '🎮';
  if (prize.includes('tesla') || prize.includes('auto')) return '🚗';
  if (prize.includes('viaje')) return '✈️';
  return '🎁';
});

function formatPrice(p) { return Number(p || 0).toFixed(2); }
function formatDate(d) {
  return new Date(d).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
}

onMounted(async () => {
  try {
    raffle.value = await raffleStore.fetchRaffle(route.params.id);
  } finally {
    loading.value = false;
  }
});
</script>
