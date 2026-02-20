<template>
  <!-- Splash screen -->
  <div v-if="showSplash" class="splash">
    <div class="splash-logo">
      <img src="/icons/icon-192.png" alt="Speak" width="80" height="80" />
      <span class="splash-title">Speak</span>
    </div>
  </div>

  <!-- Main app (mounted but hidden during splash) -->
  <v-app v-show="!showSplash" class="speak-app">
    <router-view v-if="showNav" />

    <!-- Bottom navigation (authenticated views only) -->
    <v-bottom-navigation
      v-if="showNav && auth.isLoggedIn"
      :model-value="activeTab"
      bg-color="surface"
      elevation="8"
      grow
    >
      <v-btn value="home" @click="router.push('/')">
        <v-icon>mdi-home</v-icon>
      </v-btn>
      <v-btn value="history" @click="router.push('/history')">
        <v-icon>mdi-history</v-icon>
      </v-btn>
      <v-btn value="settings" @click="router.push('/settings')">
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const showSplash = ref(true)
const showNav = ref(false)

watch(() => auth.initialized, (val) => {
  if (val) {
    setTimeout(() => {
      showSplash.value = false
      showNav.value = true
    }, 300)
  }
})

const activeTab = computed(() => {
  if (route.path === '/') return 'home'
  if (route.path === '/history') return 'history'
  if (route.path === '/settings') return 'settings'
  return null
})
</script>

<style>
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}

.v-application {
  padding-top: var(--sat);
  padding-left: var(--sal);
  padding-right: var(--sar);
}

.speak-app {
  background: radial-gradient(ellipse at 30% 25%, #1a2a4a 0%, #0b1023 60%) !important;
}

.splash {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 30% 25%, #1a2a4a 0%, #0b1023 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.splash-title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #22d3ee;
}
</style>
