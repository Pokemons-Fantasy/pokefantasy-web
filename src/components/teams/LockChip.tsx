import { lockRemaining, lockedUntilLabel } from '../../utils/teams';

/** "🔒 2d 5h": cuánto le queda a un Pokémon bloqueado (recién robado, intercambiado o comprado). */
export default function LockChip({ lockedUntil, now }: { lockedUntil: string | null | undefined; now: Date }) {
  const remaining = lockRemaining(lockedUntil, now);
  if (!remaining || !lockedUntil) return null;
  const label = lockedUntilLabel(lockedUntil);
  return (
    <span className="lock-chip" title={label}>
      <span aria-hidden="true">🔒 </span>{remaining}
      <span className="sr-only">{label}</span>
    </span>
  );
}
