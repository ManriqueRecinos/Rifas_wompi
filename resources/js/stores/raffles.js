import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useRaffleStore = defineStore('raffles', () => {
    const raffles    = ref([]);
    const current    = ref(null);
    const pagination = ref(null);
    const loading    = ref(false);
    const stats      = ref(null);

    async function fetchRaffles(params = {}) {
        loading.value = true;
        try {
            const res = await axios.get('/raffles', { params });
            raffles.value    = res.data.data;
            pagination.value = res.data;
        } finally {
            loading.value = false;
        }
    }

    async function fetchRaffle(id) {
        loading.value = true;
        try {
            const res = await axios.get(`/raffles/${id}`);
            current.value = res.data;
            return res.data;
        } finally {
            loading.value = false;
        }
    }

    async function createRaffle(data) {
        const res = await axios.post('/raffles', data);
        raffles.value.unshift(res.data);
        return res.data;
    }

    async function updateRaffle(id, data) {
        const res = await axios.put(`/raffles/${id}`, data);
        const idx = raffles.value.findIndex(r => r.id === id);
        if (idx !== -1) raffles.value[idx] = res.data;
        if (current.value?.id === id) current.value = res.data;
        return res.data;
    }

    async function deleteRaffle(id) {
        await axios.delete(`/raffles/${id}`);
        raffles.value = raffles.value.filter(r => r.id !== id);
    }

    async function drawWinner(id) {
        const res = await axios.post(`/raffles/${id}/draw`);
        if (current.value?.id === id) current.value = { ...current.value, status: 'finished' };
        return res.data;
    }

    async function fetchStats() {
        const res = await axios.get('/admin/stats');
        stats.value = res.data;
        return res.data;
    }

    return { raffles, current, pagination, loading, stats, fetchRaffles, fetchRaffle, createRaffle, updateRaffle, deleteRaffle, drawWinner, fetchStats };
});
