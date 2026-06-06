import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { apiClient } from './api/client'
import './index.css'
import App from './App.tsx'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

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
      await apiClient.post('/v1/users/push-token', { token: fcmToken })
    } catch (e) {
      console.warn('Failed to register push token', e)
    }
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push registration error', err)
  })
}
