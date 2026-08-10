import type { Tier } from '../api/pokemons';

interface TierBadgeProps {
  tier?: Tier | null;
  onClick?: (e: React.MouseEvent) => void;
}

export default function TierBadge({ tier, onClick }: TierBadgeProps) {
  if (!tier) return null;
  return (
    <span
      className={`tier-badge tier-badge-${tier.toLowerCase()}`}
      onClick={onClick}
      style={onClick ? { pointerEvents: 'auto', cursor: 'pointer' } : undefined}
      title={onClick ? 'Ajustar tier' : undefined}
    >
      {tier}
    </span>
  );
}
