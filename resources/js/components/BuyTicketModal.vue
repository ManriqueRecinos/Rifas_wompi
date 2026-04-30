<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal" role="dialog" aria-modal="true">
          <button class="modal__close" @click="$emit('close')" aria-label="Cerrar">×</button>

          <div class="modal__header">
            <h2 class="modal__title">🎟️ Comprar Ticket</h2>
            <p class="modal__subtitle">{{ raffle?.name }}</p>
          </div>

          <div class="modal__raffle-info">
            <div class="modal__info-row">
              <span>🏆 Premio:</span>
              <strong>{{ raffle?.prize }}</strong>
            </div>
            <div class="modal__info-row">
              <span>💰 Precio:</span>
              <strong class="modal__price">${{ formatPrice(raffle?.ticket_price) }}</strong>
            </div>
            <div class="modal__info-row">
              <span>🎫 Disponibles:</span>
              <strong>{{ available }} de {{ raffle?.total_tickets }}</strong>
            </div>
          </div>

    <form v-if="!paymentConfig" @submit.prevent="handleSubmit" class="modal__form">
            <!-- Form fields... -->
            <div class="form-group">
              <label class="form-label">Nombre completo *</label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': errors.name }"
                placeholder="Tu nombre completo"
                required
              >
              <p v-if="errors.name" class="form-error">{{ errors.name[0] }}</p>
            </div>

            <div class="form-group">
              <label class="form-label">Correo electrónico *</label>
              <input
                v-model="form.email"
                type="email"
                class="form-input"
                :class="{ 'form-input--error': errors.email }"
                placeholder="tu@correo.com"
                required
              >
              <p v-if="errors.email" class="form-error">{{ errors.email[0] }}</p>
            </div>

            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input
                v-model="form.phone"
                type="tel"
                class="form-input"
                placeholder="+503 7000-0000"
              >
            </div>

            <p v-if="errors.general" class="form-error form-error--center">{{ errors.general[0] }}</p>

            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" @click="$emit('close')">Cancelar</button>
              <button type="submit" class="btn btn--primary" :disabled="submitting">
                <span v-if="submitting" class="spinner"></span>
                {{ submitting ? 'Procesando...' : 'Reservar y Pagar' }}
              </button>
            </div>
          </form>

          <div v-else class="modal__payment-section">
            <p class="modal__success-msg">✅ ¡Ticket reservado con éxito!</p>
            <p class="modal__instruction">Completa tu pago para finalizar la compra:</p>
            
            <div class="wompi-container">
                <!-- Official Wompi Widget Button -->
                <div 
                    class="wompi_button_widget" 
                    :data-url-pago="paymentUrl" 
                    data-render="widget"
                ></div>
            </div>

            <!-- Fallback Direct Button -->
            <a :href="paymentUrl" target="_blank" class="btn btn--primary btn--full mt-4">
               💳 Pagar con Tarjeta / Otros medios
            </a>

            <button class="btn btn--ghost mt-4" @click="paymentConfig = null">Volver</button>
          </div>

          <p class="modal__note">
            🔒 Pago seguro procesado por <strong>Wompi</strong>. Recibirás tu ticket por correo al confirmar el pago.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const props = defineProps({
  show:   { type: Boolean, default: false },
  raffle: { type: Object, default: null },
});

const emit = defineEmits(['close', 'success']);

const auth  = useAuthStore();
const toast = useToast();

const form = ref({ name: '', email: '', phone: '' });
const errors    = ref({});
const submitting = ref(false);
const paymentConfig = ref(null);
const paymentUrl = ref('');

const available = computed(() => (props.raffle?.total_tickets || 0) - (props.raffle?.sold_tickets || 0));

// Pre-fill from logged-in user
watch(() => props.show, (val) => {
  if (val && auth.user) {
    form.value.name  = auth.user.name || '';
    form.value.email = auth.user.email || '';
    form.value.phone = auth.user.phone || '';
  }
  if (val) {
    paymentConfig.value = null;
    paymentUrl.value = '';
    errors.value = {};
  }
});

async function handleSubmit() {
  errors.value    = {};
  submitting.value = true;

  try {
    const res = await axios.post('/tickets/buy', {
      raffle_id: props.raffle.id,
      ...form.value,
    });

    toast.success('¡Ticket reservado! Procede con el pago.');

    paymentConfig.value = res.data.wompi_config;
    paymentUrl.value = res.data.payment_url;

    // Force Wompi script to re-scan the DOM for the new widget button
    await nextTick();
    
    // Remove existing script if any to avoid conflicts
    const oldScript = document.getElementById('wompi-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'wompi-script';
    script.src = "https://pagos.wompi.sv/js/wompi.pagos.js";
    script.async = true;
    document.body.appendChild(script);

    emit('success', res.data);
  } catch (err) {
    if (err.response?.data?.errors) {
      errors.value = err.response.data.errors;
    } else {
      errors.value = { general: [err.response?.data?.message || 'Error al procesar la solicitud.'] };
    }
  } finally {
    submitting.value = false;
  }
}

function formatPrice(p) {
  return Number(p || 0).toFixed(2);
}
</script>

<style scoped>
.modal__payment-section {
    text-align: center;
    padding: 1.5rem 0;
}
.modal__success-msg {
    color: var(--success);
    font-weight: 600;
    margin-bottom: 0.5rem;
}
.modal__instruction {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
}
.wompi-container {
    display: flex;
    justify-content: center;
    min-height: 50px;
}
.mt-4 {
    margin-top: 1rem;
}
.btn--full {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
}
</style>
