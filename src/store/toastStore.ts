import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Si está presente el toast no se auto-descarta y al hacer clic navega a esta ruta. */
  actionUrl?: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, actionUrl?: string) => void;
  removeToast: (id: string) => void;
  clearPersistent: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, actionUrl) =>
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id: crypto.randomUUID(), type, message, actionUrl }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearPersistent: () =>
    set((s) => ({ toasts: s.toasts.filter((t) => !t.actionUrl) })),
}));
