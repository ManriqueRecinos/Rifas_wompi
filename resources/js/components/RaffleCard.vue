<template>
  <article class="raffle-card" @click="$emit('click', raffle)">
    <div class="raffle-card__image-wrapper">
      <div class="raffle-card__image">
        <span class="raffle-card__emoji">{{ prizeEmoji }}</span>
      </div>
      <div class="raffle-card__status-badge" :class="`status--${raffle.status}`">
        {{ statusLabel }}
      </div>
    </div>

    <div class="raffle-card__body">
      <h3 class="raffle-card__title">{{ raffle.name }}</h3>
      <p class="raffle-card__prize">🏆 {{ raffle.prize }}</p>
      <p v-if="raffle.description" class="raffle-card__desc">{{ truncate(raffle.description, 80) }}</p>

      <div class="raffle-card__progress-wrap">
        <div class="raffle-card__progress-labels">
          <span>{{ raffle.sold_tickets }} vendidos</span>
          <span>{{ raffle.total_tickets }} total</span>
        </div>
        <div class="raffle-card__progress">
          <div class="raffle-card__progress-bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="raffle-card__progress-pct">{{ progressPercent }}% completado</div>
      </div>

      <div class="raffle-card__footer">
        <div class="raffle-card__price">
          <span class="raffle-card__price-label">Precio del ticket</span>
          <span class="raffle-card__price-value">${{ formatPrice(raffle.ticket_price) }}</span>
        </div>
        <button
          v-if="raffle.status === 'active'"
          class="btn btn--primary btn--sm"
          @click.stop="$emit('buy', raffle)"
        >
          🎟️ Comprar
        </button>
        <RouterLink
          v-else
          :to="`/rifas/${raffle.id}`"
          class="btn btn--ghost btn--sm"
          @click.stop
        >
          Ver detalles
        </RouterLink>
      </div>

      <div v-if="raffle.end_date" class="raffle-card__date">
        📅 Sorteo: {{ formatDate(raffle.end_date) }}
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  raffle: { type: Object, required: true },
});

defineEmits(['click', 'buy']);

const progressPercent = computed(() => {
  if (!props.raffle.total_tickets) return 0;
  return Math.min(100, Math.round((props.raffle.sold_tickets / props.raffle.total_tickets) * 100));
});

const statusLabel = computed(() => ({
  active:   '🟢 Activa',
  closed:   '🟡 Cerrada',
  finished: '🏆 Finalizada',
}[props.raffle.status] || props.raffle.status));

const prizeEmoji = computed(() => {
  const prize = props.raffle.prize?.toLowerCase() || '';
  if (prize.includes('iphone') || prize.includes('apple')) return '📱';
  if (prize.includes('mac') || prize.includes('laptop')) return '💻';
  if (prize.includes('ps5') || prize.includes('playstation') || prize.includes('xbox')) return '🎮';
  if (prize.includes('tesla') || prize.includes('auto') || prize.includes('carro')) return '🚗';
  if (prize.includes('viaje') || prize.includes('cancún') || prize.includes('trip')) return '✈️';
  if (prize.includes('tv') || prize.includes('televisor')) return '📺';
  if (prize.includes('moto')) return '🏍️';
  return '🎁';
});

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function formatPrice(p) {
  return Number(p).toFixed(2);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' });
}
</script>
