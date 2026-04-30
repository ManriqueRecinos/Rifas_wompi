<template>
  <div class="admin-page">
    <div class="admin-page__header">
      <div>
        <button class="btn btn--ghost btn--sm" @click="$router.back()">← Volver</button>
        <h1 class="admin-page__title">🎫 Tickets de: {{ raffleName }}</h1>
      </div>
      <button class="btn btn--primary" @click="showManualModal = true">+ Ticket Manual</button>
    </div>

    <!-- Stats row -->
    <div class="ticket-stats">
      <div class="ticket-stat">
        <span class="ticket-stat__number">{{ tickets.length }}</span>
        <span class="ticket-stat__label">Total</span>
      </div>
      <div class="ticket-stat ticket-stat--paid">
        <span class="ticket-stat__number">{{ paidCount }}</span>
        <span class="ticket-stat__label">Pagados</span>
      </div>
      <div class="ticket-stat ticket-stat--pending">
        <span class="ticket-stat__number">{{ pendingCount }}</span>
        <span class="ticket-stat__label">Pendientes</span>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-tabs" style="margin-bottom: 1.5rem">
      <button
        v-for="f in filters"
        :key="f.value"
        class="filter-tab"
        :class="{ 'filter-tab--active': activeFilter === f.value }"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-center">
      <div class="spinner spinner--lg"></div>
    </div>

    <div v-else class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Comprador</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ticket in filteredTickets" :key="ticket.id">
            <td>
              <span class="ticket-code-cell">{{ ticket.code }}</span>
            </td>
            <td>{{ ticket.user?.name || ticket.participant?.name || '—' }}</td>
            <td>{{ ticket.user?.email || ticket.participant?.email || '—' }}</td>
            <td>{{ ticket.user?.phone || ticket.participant?.phone || '—' }}</td>
            <td>
              <span class="status-pill" :class="`status-pill--${ticket.payment_status}`">
                {{ statusLabel(ticket.payment_status) }}
              </span>
            </td>
            <td>{{ fmtDate(ticket.purchased_at) }}</td>
          </tr>
          <tr v-if="!filteredTickets.length">
            <td colspan="6" class="table-empty">No hay tickets para mostrar</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Manual Ticket Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showManualModal" class="modal-overlay" @click.self="showManualModal = false">
          <div class="modal">
            <button class="modal__close" @click="showManualModal = false">×</button>
            <div class="modal__header">
              <h2 class="modal__title">🎫 Ticket Manual</h2>
              <p class="modal__subtitle">Sin cargo de pago (confirmado automáticamente)</p>
            </div>
            <form @submit.prevent="createManual" class="modal__form">
              <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input v-model="manualForm.name" type="text" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Correo *</label>
                <input v-model="manualForm.email" type="email" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input v-model="manualForm.phone" type="tel" class="form-input">
              </div>
              <p v-if="manualError" class="form-error form-error--center">{{ manualError }}</p>
              <div class="modal__actions">
                <button type="button" class="btn btn--ghost" @click="showManualModal = false">Cancelar</button>
                <button type="submit" class="btn btn--primary" :disabled="submitting">
                  <span v-if="submitting" class="spinner"></span>
                  {{ submitting ? 'Creando...' : 'Crear ticket' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { useToast } from '@/composables/useToast';

const route   = useRoute();
const toast   = useToast();

const tickets         = ref([]);
const raffleName      = ref('');
const loading         = ref(true);
const showManualModal = ref(false);
const submitting      = ref(false);
const manualError     = ref('');
const activeFilter    = ref('all');

const manualForm = ref({ name: '', email: '', phone: '' });

const filters = [
  { label: 'Todos', value: 'all' },
  { label: '✅ Pagados', value: 'paid' },
  { label: '⏳ Pendientes', value: 'pending' },
  { label: '❌ Fallidos', value: 'failed' },
];

const filteredTickets = computed(() =>
  activeFilter.value === 'all'
    ? tickets.value
    : tickets.value.filter(t => t.payment_status === activeFilter.value)
);

const paidCount    = computed(() => tickets.value.filter(t => t.payment_status === 'paid').length);
const pendingCount = computed(() => tickets.value.filter(t => t.payment_status === 'pending').length);

async function load() {
  loading.value = true;
  try {
    const res = await axios.get(`/raffles/${route.params.id}/tickets`);
    tickets.value    = res.data.data;
    raffleName.value = tickets.value[0]?.raffle?.name || 'Rifa';
  } finally {
    loading.value = false;
  }
}

async function createManual() {
  submitting.value = true;
  manualError.value = '';
  try {
    await axios.post('/tickets/manual', {
      raffle_id: route.params.id,
      ...manualForm.value,
    });
    toast.success('Ticket creado manualmente.');
    showManualModal.value = false;
    manualForm.value = { name: '', email: '', phone: '' };
    await load();
  } catch (err) {
    manualError.value = err.response?.data?.message || 'Error al crear el ticket.';
  } finally {
    submitting.value = false;
  }
}

function statusLabel(s) {
  return { paid: '✅ Pagado', pending: '⏳ Pendiente', failed: '❌ Fallido' }[s] || s;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(() => load());
</script>
