<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <RouterLink to="/" class="auth-card__logo">🎟️ RifasSV</RouterLink>
        <h1 class="auth-card__title">Bienvenido de vuelta</h1>
        <p class="auth-card__subtitle">Ingresa a tu cuenta para gestionar tus tickets</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label">Correo electrónico</label>
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
          <label class="form-label">Contraseña</label>
          <div class="input-wrapper">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'form-input--error': errors.password }"
              placeholder="Tu contraseña"
              autocomplete="current-password"
              required
            >
            <button type="button" class="input-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="errors.password" class="form-error">{{ errors.password[0] }}</p>
        </div>

        <p v-if="errors.general" class="form-error form-error--center">{{ errors.general[0] }}</p>

        <button type="submit" class="btn btn--primary btn--full btn--lg" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>

      <div class="auth-card__footer">
        <p>¿No tienes cuenta? <RouterLink to="/register" class="auth-link">Regístrate gratis</RouterLink></p>
      </div>

      <div class="auth-card__demo">
        <p class="auth-card__demo-label">Cuentas de prueba:</p>
        <div class="auth-card__demo-btns">
          <button class="btn btn--ghost btn--sm" @click="fillDemo('admin')">Admin</button>
          <button class="btn btn--ghost btn--sm" @click="fillDemo('user')">Usuario</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const auth   = useAuthStore();
const router = useRouter();
const route  = useRoute();
const toast  = useToast();

const form         = ref({ email: '', password: '' });
const errors       = ref({});
const showPassword = ref(false);

async function handleLogin() {
  errors.value = {};
  const result = await auth.login(form.value.email, form.value.password);

  if (result.success) {
    toast.success('¡Bienvenido de vuelta!');
    const redirect = route.query.redirect || (auth.isAdmin ? '/admin' : '/');
    router.push(redirect);
  } else {
    errors.value = result.errors;
  }
}

function fillDemo(type) {
  if (type === 'admin') {
    form.value = { email: 'admin@rifas.com', password: 'password' };
  } else {
    form.value = { email: 'juan@example.com', password: 'password' };
  }
}
</script>
