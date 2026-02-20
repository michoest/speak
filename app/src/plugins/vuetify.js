import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'speak',
    themes: {
      speak: {
        dark: true,
        colors: {
          background: '#0b1023',
          surface: '#111827',
          'surface-variant': '#1a2438',
          primary: '#22d3ee',      // cyan
          secondary: '#a78bfa',    // purple
          accent: '#34d399',       // green
          error: '#f87171',
          warning: '#fbbf24',
          info: '#3b82f6',
          success: '#34d399',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg' },
    VTextField: { variant: 'solo-filled', density: 'comfortable', flat: true },
    VSelect: { variant: 'solo-filled', density: 'comfortable', flat: true },
  },
})