import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
    },
    {
        path: '/rifas/:id',
        name: 'raffle-detail',
        component: () => import('@/pages/RaffleDetailPage.vue'),
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/pages/LoginPage.vue'),
        meta: { guestOnly: true },
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('@/pages/RegisterPage.vue'),
        meta: { guestOnly: true },
    },
    {
        path: '/mis-tickets',
        name: 'my-tickets',
        component: () => import('@/pages/MyTicketsPage.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/pago/confirmacion',
        name: 'payment-confirmation',
        component: () => import('@/pages/PaymentConfirmationPage.vue'),
    },
    {
        path: '/admin',
        component: () => import('@/pages/admin/AdminLayout.vue'),
        meta: { requiresAdmin: true },
        children: [
            {
                path: '',
                name: 'admin-dashboard',
                component: () => import('@/pages/admin/DashboardPage.vue'),
            },
            {
                path: 'rifas',
                name: 'admin-raffles',
                component: () => import('@/pages/admin/RafflesPage.vue'),
            },
            {
                path: 'rifas/:id/tickets',
                name: 'admin-raffle-tickets',
                component: () => import('@/pages/admin/RaffleTicketsPage.vue'),
            },
        ],
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/pages/NotFoundPage.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition;
        return { top: 0 };
    },
});

router.beforeEach(async (to) => {
    const auth = useAuthStore();

    if (!auth.checked) {
        await auth.fetchUser();
    }

    if (to.meta.requiresAuth && !auth.user) {
        return { name: 'login', query: { redirect: to.fullPath } };
    }

    if (to.meta.requiresAdmin && (!auth.user || !auth.isAdmin)) {
        return { name: 'home' };
    }

    if (to.meta.guestOnly && auth.user) {
        return { name: 'home' };
    }
});

export default router;
