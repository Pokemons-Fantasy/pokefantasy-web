import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import UserAvatar from '../avatar/UserAvatar';
import AccountSheet from './AccountSheet';
import { pendingLabel, usePendingTrades } from './usePendingTrades';
import styles from './AccountButton.module.css';

/** Avatar de la app bar móvil: abre "Tu cuenta"; el punto avisa de intercambios pendientes en cualquier liga. */
export default function AccountButton() {
  const username = useAuthStore((s) => s.username) ?? '';
  const { pathname } = useLocation();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000, enabled: !!username });
  const { total } = usePendingTrades();
  // Abierto para la ruta actual: al navegar (también con "atrás") se cierra solo.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={total > 0 ? `Tu cuenta, ${pendingLabel(total)}` : 'Tu cuenta'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpenPath(pathname)}
      >
        <span className="header-avatar">
          <UserAvatar username={username} avatarVersion={me?.avatarVersion ?? null} size={36} />
          {total > 0 && <span className="header-avatar-dot" aria-hidden="true" />}
        </span>
      </button>
      {open && username && <AccountSheet onClose={() => setOpenPath(null)} />}
    </>
  );
}
