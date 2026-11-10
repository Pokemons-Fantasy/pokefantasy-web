import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { LeagueShellProps } from '../league/DesktopLeagueShell';
import { mobileNav } from '../../utils/leagueNav';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import LeaguePhaseBadge from '../LeaguePhaseBadge';
import AppBar from './AppBar';
import AccountButton from './AccountButton';
import BottomNav from './BottomNav';
import type { BottomNavItem } from './BottomNav';
import MoreSheet from './MoreSheet';
import LeagueSwitcherSheet from './LeagueSwitcherSheet';
import { navIcons } from './navIcons';
import { pendingLabel, usePendingTrades } from './usePendingTrades';
import styles from './MobileLeagueShell.module.css';

type OpenSheet = 'more' | 'switcher' | null;

/** Marco de la liga en móvil: app bar (liga y cuenta), contenido y barra inferior con "Más". */
export default function MobileLeagueShell({ league, draftStatus, phase, loadingDraft, isAdmin, section, children }: LeagueShellProps) {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const { byLeague } = usePendingTrades();
  // Abierto para la ruta actual: al navegar (también con "atrás" del navegador) se cierra solo.
  const [sheet, setSheet] = useState<{ kind: OpenSheet; path: string }>({ kind: null, path: '' });
  const open = sheet.path === pathname ? sheet.kind : null;
  const show = (kind: OpenSheet) => setSheet({ kind, path: pathname });
  const close = () => setSheet({ kind: null, path: '' });

  const nav = mobileNav(phase, isAdmin);
  const pending = byLeague.get(league.id) ?? 0;
  const items: BottomNavItem[] = nav.bar.map((item) => ({
    ...item,
    icon: navIcons[item.path],
    ...(item.path === 'teams' && pending > 0 ? { badge: pending, badgeLabel: pendingLabel(pending) } : {}),
  }));

  return (
    <div className={styles.shell}>
      <AppBar
        title={
          <button
            type="button"
            className={styles.leagueButton}
            aria-haspopup="dialog"
            aria-label={`${league.name}. Cambiar de liga`}
            onClick={() => show('switcher')}
          >
            <span className={styles.leagueName}>{league.name}</span>
            {!loadingDraft && <LeaguePhaseBadge draftStatus={draftStatus} />}
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        }
        right={<AccountButton />}
      />

      <motion.div
        key={section}
        className={styles.content}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>

      {!loadingDraft && (
        <BottomNav
          items={items}
          active={section}
          onMore={() => show('more')}
          moreActive={nav.more.some((item) => item.path === section)}
        />
      )}

      {open === 'more' && <MoreSheet items={nav.more} active={section} onClose={close} />}
      {open === 'switcher' && <LeagueSwitcherSheet currentLeagueId={league.id} onClose={close} />}
    </div>
  );
}
