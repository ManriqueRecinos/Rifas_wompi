<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <RouterLink to="/" class="auth-card__logo">🎟️ RifasSV</RouterLink>
        <h1 class="auth-card__title">Crear cuenta</h1>
        <p class="auth-card__subtitle">Únete y participa en rifas con grandes premios</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label">Nombre completo *</label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': errors.name }"
            placeholder="Tu nombre completo"
            autocomplete="name"
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
            autocomplete="email"
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

        <div class="form-group">
          <label class="form-label">Contraseña *</label>
          <div class="input-wrapper">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'form-input--error': errors.password }"
              placeholder="Mínimo 8 caracteres"
              required
            >
            <button type="button" class="input-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="errors.password" class="form-error">{{ errors.password[0] }}</p>
        </div>

        <div class="form-group">
          <label class="form-label">Confirmar contraseña *</label>
          <input
            v-model="form.password_confirmation"
            :type="showPassword ? 'text' : 'password'"
            class="form-input"
            placeholder="Repite tu contraseña"
            required
          >
        </div>

        <p v-if="errors.general" class="form-error form-error--center">{{ errors.general[0] }}</p>

        <button type="submit" class="btn btn--primary btn--full btn--lg" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          {{ auth.loading ? 'Creando cuenta...' : '🚀 Crear cuenta gratis' }}
        </button>
      </form>

      <div class="auth-card__footer">
        <p>¿Ya tienes cuenta? <RouterLink to="/login" class="auth-link">Ingresar</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const auth   = useAuthStore();
const router = useRouter();
const toast  = useToast();

const form = ref({
  name: '', email: '', phone: '', password: '', password_confirmation: '',
});
const errors      = ref({});
const showPassword = ref(false);

async function handleRegister() {
  errors.value = {};
  const result = await auth.register(form.value);

  if (result.success) {
    toast.success('¡Cuenta creada exitosamente!');
    router.push('/');
  } else {
    errors.value = result.errors;
  }
}
</script>
