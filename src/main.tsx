import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

  PushNotifications.addListener('registration', async ({ value: token }) => {
    try {
      const raw = localStorage.getItem('auth-storage')
      if (!raw) return
      const { state } = JSON.parse(raw) as { state: { token?: string } }
      if (!state?.token) return
      await fetch('https://pokefantasy.onrender.com/v1/users/push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ token }),
      })
    } catch (e) {
      console.warn('Failed to register push token', e)
    }
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push registration error', err)
  })
}
