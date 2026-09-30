import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { onSessionExpired } from './api/client'
import { registerPushToken } from './api/push'
import './index.css'
import App from './App.tsx'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuthStore } from './store/authStore'

// Sin sesión en el backend: se olvida el usuario y ProtectedRoute lleva a /login recordando la ruta
onSessionExpired(() => useAuthStore.getState().expireSession())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (Capacitor.isNativePlatform()) {
  PushNotifications.requestPermissions().then(({ receive }) => {
    if (receive === 'granted') {
      PushNotifications.register()
    }
  })

  PushNotifications.addListener('registration', async ({ value: fcmToken }) => {
    try {
      await registerPushToken(fcmToken)
    } catch (e) {
      console.warn('Failed to register push token', e)
    }
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push registration error', err)
  })
}
