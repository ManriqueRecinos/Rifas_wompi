import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export const useAuthStore = defineStore('auth', () => {
    const user    = ref(null);
    const token   = ref(localStorage.getItem('auth_token'));
    const checked = ref(false);
    const loading = ref(false);

    const isAdmin = computed(() => user.value?.role === 'admin');
    const isAuth  = computed(() => !!user.value);

    function setToken(newToken) {
        token.value = newToken;
        localStorage.setItem('auth_token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }

    function clearAuth() {
        user.value  = null;
        token.value = null;
        checked.value = true;
        localStorage.removeItem('auth_token');
        delete axios.defaults.headers.common['Authorization'];
    }

    async function fetchUser() {
        if (!token.value) {
            checked.value = true;
            return;
        }
        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
            const res = await axios.get('/auth/me');
            user.value = res.data;
        } catch {
            clearAuth();
        } finally {
            checked.value = true;
        }
    }

    async function login(email, password) {
        loading.value = true;
        try {
            const res = await axios.post('/auth/login', { email, password });
            setToken(res.data.token);
            user.value = res.data.user;
            return { success: true };
        } catch (err) {
            return { success: false, errors: err.response?.data?.errors || { general: [err.response?.data?.message || 'Error al iniciar sesión'] } };
        } finally {
            loading.value = false;
        }
    }

    async function register(data) {
        loading.value = true;
        try {
            const res = await axios.post('/auth/register', data);
            setToken(res.data.token);
            user.value = res.data.user;
            return { success: true };
        } catch (err) {
            return { success: false, errors: err.response?.data?.errors || { general: [err.response?.data?.message || 'Error al registrar'] } };
        } finally {
            loading.value = false;
        }
    }

    async function logout() {
        try {
            await axios.post('/auth/logout');
        } finally {
            clearAuth();
        }
    }

    return { user, token, checked, loading, isAdmin, isAuth, fetchUser, login, register, logout };
});
