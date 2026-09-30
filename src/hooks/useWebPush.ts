import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { webPushStatus, type WebPushStatus } from '../utils/webPush';
import { readWebPushEnv } from '../push/env';
import { disableWebPush, dismissWebPushPrompt, enableWebPush, isWebPushPromptDismissed } from '../push/webPush';

/** Estado y acciones de los avisos push de este navegador para el usuario en sesión. */
export function useWebPush(): {
  status: WebPushStatus; dismissed: boolean; busy: boolean;
  enable: () => void; disable: () => void; dismiss: () => void;
} {
  const username = useAuthStore((s) => s.username);
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  // El estado vive en el navegador (permiso, localStorage): se relee tras cada acción
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((r) => r + 1);

  const status = webPushStatus(readWebPushEnv(username));
  const dismissed = !!username && isWebPushPromptDismissed(username);

  const enable = () => {
    if (!username) return;
    setBusy(true);
    // enableWebPush pide el permiso lo primero: se llama aquí mismo, dentro del clic
    enableWebPush(username)
      .then((result) => {
        if (result === 'enabled') addToast('success', 'Notificaciones activadas');
        if (result === 'blocked') addToast('info', 'Has bloqueado las notificaciones en este navegador');
      })
      .catch(() => addToast('error', 'No se pudieron activar las notificaciones'))
      .finally(() => { setBusy(false); refresh(); });
  };

  const disable = () => {
    if (!username) return;
    setBusy(true);
    disableWebPush(username)
      .then(() => addToast('success', 'Notificaciones desactivadas en este dispositivo'))
      .finally(() => { setBusy(false); refresh(); });
  };

  const dismiss = () => {
    if (!username) return;
    dismissWebPushPrompt(username);
    refresh();
  };

  return { status, dismissed, busy, enable, disable, dismiss };
}
