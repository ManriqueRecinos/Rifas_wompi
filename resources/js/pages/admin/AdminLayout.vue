<template>
  <div class="admin-layout">
    <!-- Admin Sidebar -->
    <aside class="admin-sidebar">
      <div class="admin-sidebar__logo">
        <RouterLink to="/">🎟️ RifasSV</RouterLink>
        <span class="admin-sidebar__badge">Admin</span>
      </div>

      <nav class="admin-nav">
        <RouterLink to="/admin" end class="admin-nav__item" active-class="admin-nav__item--active">
          <span class="admin-nav__icon">📊</span> Dashboard
        </RouterLink>
        <RouterLink to="/admin/rifas" class="admin-nav__item" active-class="admin-nav__item--active">
          <span class="admin-nav__icon">🎟️</span> Rifas
        </RouterLink>
        <RouterLink to="/" class="admin-nav__item">
          <span class="admin-nav__icon">🌐</span> Ver sitio
        </RouterLink>
      </nav>

      <div class="admin-sidebar__user">
        <div class="admin-sidebar__avatar">{{ initials }}</div>
        <div>
          <div class="admin-sidebar__name">{{ auth.user?.name }}</div>
          <div class="admin-sidebar__role">Administrador</div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="admin-main">
      <RouterView />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const initials = computed(() => {
  const name = auth.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
});
</script>
