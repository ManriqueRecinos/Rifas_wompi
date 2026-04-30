<template>
  <footer class="footer">
    <div class="footer__container">
      <div class="footer__brand">
        <span class="footer__logo">🎟️ RifasSV</span>
        <p class="footer__tagline">La plataforma de rifas más confiable de El Salvador</p>
      </div>
      <div class="footer__links">
        <a href="#" class="footer__link">Términos y Condiciones</a>
        <a href="#" class="footer__link">Privacidad</a>
        <a href="#" class="footer__link">Contacto</a>
      </div>
      <div class="footer__bottom">
        <p>© {{ year }} RifasSV. Todos los derechos reservados.</p>
        <div class="footer__badges">
          <span class="footer__badge">🔒 Pagos seguros con Wompi</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>
