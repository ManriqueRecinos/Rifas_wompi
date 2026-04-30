<template>
  <nav class="navbar" :class="{ 'navbar--scrolled': scrolled }">
    <div class="navbar__container">
      <!-- Logo -->
      <RouterLink to="/" class="navbar__logo">
        <span class="navbar__logo-icon">🎟️</span>
        <span class="navbar__logo-text">Rifas<span class="navbar__logo-accent">SV</span></span>
      </RouterLink>

      <!-- Desktop Nav -->
      <div class="navbar__links">
        <RouterLink to="/" class="navbar__link" active-class="navbar__link--active">Inicio</RouterLink>
        <RouterLink v-if="auth.isAuth" to="/mis-tickets" class="navbar__link" active-class="navbar__link--active">Mis Tickets</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin" class="navbar__link navbar__link--admin" active-class="navbar__link--active">
          ⚙️ Admin
        </RouterLink>
      </div>

      <!-- Auth Actions -->
      <div class="navbar__actions">
        <template v-if="auth.isAuth">
          <div class="navbar__user" @click="menuOpen = !menuOpen" ref="userMenuRef">
            <div class="navbar__avatar">{{ initials }}</div>
            <span class="navbar__username">{{ auth.user?.name?.split(' ')[0] }}</span>
            <span class="navbar__chevron" :class="{ 'rotate': menuOpen }">▼</span>
          </div>
          <Transition name="dropdown">
            <div v-if="menuOpen" class="navbar__dropdown">
              <RouterLink to="/mis-tickets" class="navbar__dropdown-item" @click="menuOpen = false">
                🎟️ Mis Tickets
              </RouterLink>
              <RouterLink v-if="auth.isAdmin" to="/admin" class="navbar__dropdown-item" @click="menuOpen = false">
                ⚙️ Panel Admin
              </RouterLink>
              <hr class="navbar__dropdown-divider">
              <button class="navbar__dropdown-item navbar__dropdown-item--danger" @click="handleLogout">
                🚪 Cerrar Sesión
              </button>
            </div>
          </Transition>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn--ghost btn--sm">Ingresar</RouterLink>
          <RouterLink to="/register" class="btn btn--primary btn--sm">Registrarse</RouterLink>
        </template>
      </div>

      <!-- Mobile Toggle -->
      <button class="navbar__mobile-toggle" @click="mobileOpen = !mobileOpen" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- Mobile Menu -->
    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="navbar__mobile">
        <RouterLink to="/" class="navbar__mobile-link" @click="mobileOpen = false">Inicio</RouterLink>
        <RouterLink v-if="auth.isAuth" to="/mis-tickets" class="navbar__mobile-link" @click="mobileOpen = false">Mis Tickets</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin" class="navbar__mobile-link" @click="mobileOpen = false">⚙️ Admin</RouterLink>
        <div class="navbar__mobile-divider"></div>
        <template v-if="auth.isAuth">
          <button class="navbar__mobile-link navbar__mobile-link--danger" @click="handleLogout">Cerrar Sesión</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="navbar__mobile-link" @click="mobileOpen = false">Ingresar</RouterLink>
          <RouterLink to="/register" class="navbar__mobile-link navbar__mobile-link--highlight" @click="mobileOpen = false">Registrarse</RouterLink>
        </template>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth       = useAuthStore();
const router     = useRouter();
const scrolled   = ref(false);
const menuOpen   = ref(false);
const mobileOpen = ref(false);
const userMenuRef = ref(null);

const initials = computed(() => {
  const name = auth.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
});

async function handleLogout() {
  menuOpen.value   = false;
  mobileOpen.value = false;
  await auth.logout();
  router.push('/');
}

function handleScroll() {
  scrolled.value = window.scrollY > 20;
}

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    menuOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleClickOutside);
});
</script>
