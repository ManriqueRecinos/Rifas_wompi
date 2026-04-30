<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero__bg">
        <div class="hero__orb hero__orb--1"></div>
        <div class="hero__orb hero__orb--2"></div>
        <div class="hero__orb hero__orb--3"></div>
      </div>
      <div class="hero__content">
        <div class="hero__badge">✨ La plataforma más confiable de El Salvador</div>
        <h1 class="hero__title">
          Gana premios
          <span class="hero__title-gradient">increíbles</span>
          con solo un ticket
        </h1>
        <p class="hero__subtitle">
          Rifas transparentes y seguras. Pagos verificados por Wompi.
          Ganadores seleccionados al azar con total imparcialidad.
        </p>
        <div class="hero__cta">
          <a href="#rifas" class="btn btn--primary btn--lg">
            🎟️ Ver Rifas Activas
          </a>
          <RouterLink v-if="!auth.isAuth" to="/register" class="btn btn--ghost btn--lg">
            Crear cuenta gratis
          </RouterLink>
        </div>
        <div class="hero__stats">
          <div class="hero__stat">
            <span class="hero__stat-number">500+</span>
            <span class="hero__stat-label">Tickets vendidos</span>
          </div>
          <div class="hero__stat-divider"></div>
          <div class="hero__stat">
            <span class="hero__stat-number">50+</span>
            <span class="hero__stat-label">Ganadores felices</span>
          </div>
          <div class="hero__stat-divider"></div>
          <div class="hero__stat">
            <span class="hero__stat-number">100%</span>
            <span class="hero__stat-label">Pagos seguros</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Raffles Section -->
    <section id="rifas" class="section">
      <div class="section__container">
        <div class="section__header">
          <h2 class="section__title">Rifas Activas</h2>
          <p class="section__subtitle">Elige tu oportunidad de ganar grandes premios</p>
        </div>

        <!-- Filter tabs -->
        <div class="filter-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ 'filter-tab--active': activeTab === tab.value }"
            @click="changeTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="raffleStore.loading" class="raffles-grid">
          <div v-for="i in 6" :key="i" class="raffle-skeleton">
            <div class="skeleton skeleton--image"></div>
            <div class="skeleton-body">
              <div class="skeleton skeleton--title"></div>
              <div class="skeleton skeleton--text"></div>
              <div class="skeleton skeleton--text skeleton--short"></div>
            </div>
          </div>
        </div>

        <!-- Raffles grid -->
        <div v-else-if="raffleStore.raffles.length" class="raffles-grid">
          <RaffleCard
            v-for="raffle in raffleStore.raffles"
            :key="raffle.id"
            :raffle="raffle"
            @click="goToRaffle(raffle)"
            @buy="openBuyModal(raffle)"
          />
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-state__icon">🎟️</div>
          <h3 class="empty-state__title">No hay rifas disponibles</h3>
          <p class="empty-state__text">Vuelve pronto, se vienen grandes premios.</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="how-it-works">
      <div class="section__container">
        <div class="section__header">
          <h2 class="section__title">¿Cómo funciona?</h2>
        </div>
        <div class="steps-grid">
          <div class="step">
            <div class="step__number">01</div>
            <div class="step__icon">🔍</div>
            <h3 class="step__title">Elige una rifa</h3>
            <p class="step__desc">Explora las rifas activas y selecciona el premio que más te llame la atención.</p>
          </div>
          <div class="step">
            <div class="step__number">02</div>
            <div class="step__icon">💳</div>
            <h3 class="step__title">Compra tu ticket</h3>
            <p class="step__desc">Paga de forma segura con Wompi. Solo necesitas tu nombre, correo y teléfono.</p>
          </div>
          <div class="step">
            <div class="step__number">03</div>
            <div class="step__icon">📧</div>
            <h3 class="step__title">Recibe confirmación</h3>
            <p class="step__desc">Te enviamos tu ticket con código único por correo electrónico.</p>
          </div>
          <div class="step">
            <div class="step__number">04</div>
            <div class="step__icon">🏆</div>
            <h3 class="step__title">¡Gana!</h3>
            <p class="step__desc">El ganador se selecciona al azar y se notifica por correo. ¡Puede ser tú!</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Buy Modal -->
    <BuyTicketModal
      :show="showModal"
      :raffle="selectedRaffle"
      @close="showModal = false"
      @success="showModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRaffleStore } from '@/stores/raffles';
import RaffleCard from '@/components/RaffleCard.vue';
import BuyTicketModal from '@/components/BuyTicketModal.vue';

const auth         = useAuthStore();
const raffleStore  = useRaffleStore();
const router       = useRouter();
const showModal    = ref(false);
const selectedRaffle = ref(null);
const activeTab    = ref('active');

const tabs = [
  { label: '🟢 Activas', value: 'active' },
  { label: '🟡 Cerradas', value: 'closed' },
  { label: '🏆 Finalizadas', value: 'finished' },
];

async function changeTab(tab) {
  activeTab.value = tab;
  await raffleStore.fetchRaffles({ status: tab });
}

function goToRaffle(raffle) {
  router.push(`/rifas/${raffle.id}`);
}

function openBuyModal(raffle) {
  selectedRaffle.value = raffle;
  showModal.value = true;
}

onMounted(() => raffleStore.fetchRaffles({ status: 'active' }));
</script>
