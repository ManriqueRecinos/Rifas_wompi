import { ref } from 'vue';

const toasts = ref([]);
let idCounter = 0;

export function useToast() {
    function add(message, type = 'info', duration = 4000) {
        const id = ++idCounter;
        toasts.value.push({ id, message, type });
        if (duration > 0) {
            setTimeout(() => remove(id), duration);
        }
        return id;
    }

    function remove(id) {
        const idx = toasts.value.findIndex(t => t.id === id);
        if (idx !== -1) toasts.value.splice(idx, 1);
    }

    return {
        toasts,
        success: (msg) => add(msg, 'success'),
        error:   (msg) => add(msg, 'error'),
        info:    (msg) => add(msg, 'info'),
        warning: (msg) => add(msg, 'warning'),
        remove,
    };
}
