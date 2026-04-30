<template>
  <div class="page">
    <div class="section__container">
      <div class="confirmation-page">
        <div v-if="loading" class="loading-center">
          <div class="spinner spinner--lg"></div>
          <p style="margin-top:1rem; color: var(--text-muted)">Verificando tu pago...</p>
        </div>

        <template v-else>
          <!-- Success -->
          <div v-if="isPaid" class="confirmation-card confirmation-card--success">
            <div class="confirmation-card__icon">🎉</div>
            <h1 class="confirmation-card__title">¡Pago confirmado!</h1>
            <p class="confirmation-card__subtitle">Tu ticket ha sido activado exitosamente</p>

            <div class="confirmation-card__ticket">
              <span class="confirmation-card__code">{{ ticketData?.code }}</span>
              <span class="confirmation-card__label">Tu número de ticket</span>
            </div>

            <div class="confirmation-card__info">
              <div class="confirmation-card__row">
                <span>Rifa</span>
                <strong>{{ ticketData?.raffle?.name }}</strong>
              </div>
              <div class="confirmation-card__row">
                <span>Premio</span>
                <strong>{{ ticketData?.raffle?.prize }}</strong>
              </div>
            </div>

            <p class="confirmation-card__note">
              📧 Revisa tu correo, te enviamos el comprobante con todos los detalles.
            </p>

            <div class="confirmation-card__actions">
              <RouterLink to="/" class="btn btn--ghost">Ir al inicio</RouterLink>
              <RouterLink v-if="auth.isAuth" to="/mis-tickets" class="btn btn--primary">Ver mis tickets</RouterLink>
            </div>
          </div>

          <!-- Failed / Pending -->
          <div v-else class="confirmation-card confirmation-card--pending">
            <div class="confirmation-card__icon">{{ isPending ? '⏳' : '❌' }}</div>
            <h1 class="confirmation-card__title">
              {{ isPending ? 'Pago pendiente' : 'Pago no completado' }}
            </h1>
            <p class="confirmation-card__subtitle">
              {{ isPending
                ? 'Tu pago está siendo procesado. Puede tardar unos minutos.'
                : 'No pudimos confirmar tu pago. Intenta nuevamente.' }}
            </p>
            <div class="confirmation-card__actions">
              <RouterLink to="/" class="btn btn--ghost">Ir al inicio</RouterLink>
              <button v-if="!isPending" class="btn btn--primary" @click="retry">Reintentar</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const route  = useRoute();
const router = useRouter();
const auth   = useAuthStore();

const loading    = ref(true);
const ticketData = ref(null);
const status     = ref(null);

const isPaid    = computed(() => status.value === 'paid' || route.query.esAprobada === 'True');
const isPending = computed(() => status.value === 'pending');

async function verify() {
  const ticketId = route.query.referencia || route.query.ticket_id;
  if (!ticketId) {
    // Wompi redirect with query params - trust the hash
    status.value = route.query.esAprobada === 'True' ? 'paid' : 'failed';
    loading.value = false;
    return;
  }

  try {
    const res = await axios.get('/payments/verify', { params: { ticket_id: ticketId } });
    status.value     = res.data.payment_status;
    ticketData.value = res.data.ticket;
  } catch {
    status.value = 'failed';
  } finally {
    loading.value = false;
  }
}

function retry() {
  router.push('/');
}

onMounted(() => verify());
</script>
