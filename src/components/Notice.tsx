import type { ReactNode } from 'react';

export type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

interface NoticeProps {
  variant?: NoticeVariant;
  children: ReactNode;
}

/** Aviso en línea. El color sigue la semántica de tokens: warning = bloqueo o aviso, danger = error. */
export default function Notice({ variant = 'info', children }: NoticeProps) {
  return (
    <div className={`notice notice-${variant}`} role={variant === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
