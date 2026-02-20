import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { requiresGuest: true } },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { requiresGuest: true } },
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/drill', name: 'drill', component: () => import('@/views/DrillView.vue'), meta: { requiresAuth: true } },
  { path: '/conversation', name: 'conversation', component: () => import('@/views/ConversationView.vue'), meta: { requiresAuth: true } },
  { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) await auth.checkAuth()

  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login'
  if (to.meta.requiresGuest && auth.isLoggedIn) return '/'
})

export default router
