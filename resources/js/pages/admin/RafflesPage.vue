<template>
  <div class="admin-page">
    <div class="admin-page__header">
      <h1 class="admin-page__title">🎟️ Gestión de Rifas</h1>
      <button class="btn btn--primary" @click="openCreate">+ Nueva Rifa</button>
    </div>

    <!-- Table -->
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Rifa</th>
            <th>Precio</th>
            <th>Progreso</th>
            <th>Estado</th>
            <th>Fin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="raffle in raffleStore.raffles" :key="raffle.id">
            <td>
              <div class="table-raffle-name">{{ raffle.name }}</div>
              <div class="table-raffle-prize">🏆 {{ raffle.prize }}</div>
            </td>
            <td>${{ fmtNum(raffle.ticket_price) }}</td>
            <td>
              <div class="table-progress">
                <span>{{ raffle.sold_tickets }} / {{ raffle.total_tickets }}</span>
                <div class="progress-bar progress-bar--sm">
                  <div class="progress-bar__fill" :style="{ width: pct(raffle) + '%' }"></div>
                </div>
              </div>
            </td>
            <td>
              <select
                class="status-select"
                :value="raffle.status"
                @change="changeStatus(raffle, $event.target.value)"
              >
                <option value="active">🟢 Activa</option>
                <option value="closed">🟡 Cerrada</option>
                <option value="finished">🏆 Finalizada</option>
              </select>
            </td>
            <td>{{ raffle.end_date ? fmtDate(raffle.end_date) : '—' }}</td>
            <td>
              <div class="table-actions">
                <RouterLink :to="`/admin/rifas/${raffle.id}/tickets`" class="btn btn--ghost btn--xs">
                  Tickets
                </RouterLink>
                <button class="btn btn--ghost btn--xs" @click="openEdit(raffle)">Editar</button>
                <button
                  v-if="raffle.status === 'active' && raffle.sold_tickets > 0"
                  class="btn btn--gold btn--xs"
                  @click="confirmDraw(raffle)"
                >
                  🎲 Sortear
                </button>
                <button
                  class="btn btn--danger btn--xs"
                  @click="confirmDelete(raffle)"
                  :disabled="raffle.sold_tickets > 0"
                >
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
          <div class="modal modal--wide">
            <button class="modal__close" @click="showForm = false">×</button>
            <div class="modal__header">
              <h2 class="modal__title">{{ editing ? '✏️ Editar Rifa' : '➕ Nueva Rifa' }}</h2>
            </div>

            <form @submit.prevent="handleSubmit" class="modal__form">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Nombre de la rifa *</label>
                  <input v-model="form.name" type="text" class="form-input" required placeholder="Ej: iPhone 16 Pro">
                </div>
                <div class="form-group">
                  <label class="form-label">Premio *</label>
                  <input v-model="form.prize" type="text" class="form-input" required placeholder="Descripción del premio">
                </div>
                <div class="form-group">
                  <label class="form-label">Precio por ticket ($) *</label>
                  <input v-model="form.ticket_price" type="number" step="0.01" min="0.01" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Total de tickets *</label>
                  <input v-model="form.total_tickets" type="number" min="1" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha inicio</label>
                  <input v-model="form.start_date" type="datetime-local" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha del sorteo</label>
                  <input v-model="form.end_date" type="datetime-local" class="form-input">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea v-model="form.description" class="form-input form-input--textarea" rows="3" placeholder="Detalles del premio y condiciones..."></textarea>
              </div>

              <p v-if="formError" class="form-error form-error--center">{{ formError }}</p>

              <div class="modal__actions">
                <button type="button" class="btn btn--ghost" @click="showForm = false">Cancelar</button>
                <button type="submit" class="btn btn--primary" :disabled="submitting">
                  <span v-if="submitting" class="spinner"></span>
                  {{ submitting ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear rifa') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Draw Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDrawConfirm" class="modal-overlay" @click.self="showDrawConfirm = false">
          <div class="modal modal--sm">
            <div class="modal__header">
              <h2 class="modal__title">🎲 Confirmar sorteo</h2>
              <p>¿Realizar el sorteo de <strong>{{ drawTarget?.name }}</strong>?</p>
              <p class="modal__warning">Esta acción no se puede deshacer.</p>
            </div>
            <div class="modal__actions">
              <button class="btn btn--ghost" @click="showDrawConfirm = false">Cancelar</button>
              <button class="btn btn--primary" @click="executeDraw" :disabled="submitting">
                <span v-if="submitting" class="spinner"></span>
                {{ submitting ? 'Sorteando...' : '🎲 ¡Sortear ahora!' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRaffleStore } from '@/stores/raffles';
import { useToast } from '@/composables/useToast';

const raffleStore = useRaffleStore();
const toast       = useToast();

const showForm       = ref(false);
const showDrawConfirm = ref(false);
const editing        = ref(null);
const drawTarget     = ref(null);
const submitting     = ref(false);
const formError      = ref('');

const form = ref({
  name: '', description: '', prize: '', ticket_price: '',
  total_tickets: '', start_date: '', end_date: '',
});

function openCreate() {
  editing.value = null;
  form.value = { name: '', description: '', prize: '', ticket_price: '', total_tickets: '', start_date: '', end_date: '' };
  formError.value = '';
  showForm.value = true;
}

function openEdit(raffle) {
  editing.value = raffle;
  form.value = {
    name: raffle.name, description: raffle.description || '', prize: raffle.prize,
    ticket_price: raffle.ticket_price, total_tickets: raffle.total_tickets,
    start_date: raffle.start_date?.slice(0, 16) || '',
    end_date: raffle.end_date?.slice(0, 16) || '',
  };
  formError.value = '';
  showForm.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  formError.value  = '';
  try {
    if (editing.value) {
      await raffleStore.updateRaffle(editing.value.id, form.value);
      toast.success('Rifa actualizada correctamente.');
    } else {
      await raffleStore.createRaffle(form.value);
      toast.success('Rifa creada exitosamente.');
    }
    showForm.value = false;
  } catch (err) {
    formError.value = err.response?.data?.message || 'Error al guardar.';
  } finally {
    submitting.value = false;
  }
}

async function changeStatus(raffle, status) {
  try {
    await raffleStore.updateRaffle(raffle.id, { status });
    toast.success('Estado actualizado.');
  } catch {
    toast.error('Error al cambiar el estado.');
  }
}

async function confirmDelete(raffle) {
  if (!confirm(`¿Eliminar la rifa "${raffle.name}"?`)) return;
  try {
    await raffleStore.deleteRaffle(raffle.id);
    toast.success('Rifa eliminada.');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Error al eliminar.');
  }
}

function confirmDraw(raffle) {
  drawTarget.value = raffle;
  showDrawConfirm.value = true;
}

async function executeDraw() {
  submitting.value = true;
  try {
    const res = await raffleStore.drawWinner(drawTarget.value.id);
    showDrawConfirm.value = false;
    toast.success(`🏆 ¡Ganador: ${res.winner?.ticket?.code}!`);
    await raffleStore.fetchRaffles();
  } catch (err) {
    toast.error(err.response?.data?.message || 'Error en el sorteo.');
  } finally {
    submitting.value = false;
  }
}

function pct(r) { return Math.min(100, Math.round((r.sold_tickets / r.total_tickets) * 100)); }
function fmtNum(v) { return Number(v || 0).toFixed(2); }
function fmtDate(d) { return new Date(d).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' }); }

onMounted(() => raffleStore.fetchRaffles());
</script>
