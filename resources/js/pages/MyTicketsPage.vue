<template>
  <div class="page">
    <div class="section__container">
      <div class="page__header">
        <h1 class="page__title">🎟️ Mis Tickets</h1>
        <p class="page__subtitle">Todos tus tickets de participación</p>
      </div>

      <div v-if="loading" class="loading-center">
        <div class="spinner spinner--lg"></div>
      </div>

      <div v-else-if="tickets.length" class="tickets-list">
        <div
          v-for="ticket in tickets"
          :key="ticket.id"
          class="ticket-item"
          :class="`ticket-item--${ticket.payment_status}`"
        >
          <div class="ticket-item__left">
            <div class="ticket-item__code">{{ ticket.code }}</div>
            <div class="ticket-item__raffle">{{ ticket.raffle?.name }}</div>
            <div class="ticket-item__date">
              {{ formatDate(ticket.purchased_at) }}
            </div>
          </div>

          <div class="ticket-item__center">
            <div class="ticket-item__prize">🏆 {{ ticket.raffle?.prize }}</div>
            <div class="ticket-item__price">${{ formatPrice(ticket.raffle?.ticket_price) }}</div>
          </div>

          <div class="ticket-item__right">
            <div class="ticket-item__status" :class="`status-pill--${ticket.payment_status}`">
              {{ statusLabel(ticket.payment_status) }}
            </div>
            <div v-if="ticket.raffle?.winner" class="ticket-item__winner-info">
              <span v-if="ticket.raffle.winner.ticket_id === ticket.id" class="ticket-item__won">
                🏆 ¡Ganaste!
              </span>
              <span v-else class="ticket-item__not-won">
                Ganador: {{ ticket.raffle.winner.ticket?.code }}
              </span>
            </div>
            <RouterLink :to="`/rifas/${ticket.raffle_id}`" class="btn btn--ghost btn--xs">
              Ver rifa
            </RouterLink>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination?.last_page > 1" class="pagination">
          <button
            v-for="page in pagination.last_page"
            :key="page"
            class="pagination__btn"
            :class="{ 'pagination__btn--active': page === pagination.current_page }"
            @click="loadPage(page)"
          >
            {{ page }}
          </button>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-state__icon">🎟️</div>
        <h3 class="empty-state__title">No tienes tickets aún</h3>
        <p class="empty-state__text">¡Participa en una rifa y prueba tu suerte!</p>
        <RouterLink to="/" class="btn btn--primary">Ver rifas activas</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const tickets    = ref([]);
const pagination = ref(null);
const loading    = ref(true);

async function loadPage(page = 1) {
  loading.value = true;
  try {
    const res = await axios.get('/my-tickets', { params: { page } });
    tickets.value    = res.data.data;
    pagination.value = res.data;
  } finally {
    loading.value = false;
  }
}

function statusLabel(status) {
  return { pending: '⏳ Pendiente', paid: '✅ Pagado', failed: '❌ Fallido' }[status] || status;
}

function formatPrice(p) { return Number(p || 0).toFixed(2); }
function formatDate(d) {
  return new Date(d).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(() => loadPage());
</script>
