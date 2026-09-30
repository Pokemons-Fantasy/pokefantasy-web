/** Configuración web de Firebase (valores públicos, en variables de Netlify). Sin alguna, no hay avisos web. */
export function firebaseWebConfig() {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = env.VITE_FIREBASE_APP_ID;
  const vapidKey = env.VITE_FIREBASE_VAPID_KEY;
  if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) return null;
  return { config: { apiKey, projectId, messagingSenderId, appId }, vapidKey };
}

export const webPushConfigured = () => firebaseWebConfig() !== null;
