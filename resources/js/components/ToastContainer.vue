<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        @click="remove(toast.id)"
      >
        <span class="toast__icon">{{ icons[toast.type] }}</span>
        <span class="toast__message">{{ toast.message }}</span>
        <button class="toast__close">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '@/composables/useToast';

const { toasts, remove } = useToast();

const icons = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
  warning: '⚠️',
};
</script>
