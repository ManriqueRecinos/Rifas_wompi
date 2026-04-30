<template>
  <div class="app-root">
    <AppNavbar />
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
    <Teleport to="body">
      <ToastContainer />
    </Teleport>
  </div>
</template>

<script setup>
import AppNavbar from '@/components/AppNavbar.vue';
import AppFooter from '@/components/AppFooter.vue';
import ToastContainer from '@/components/ToastContainer.vue';
</script>
