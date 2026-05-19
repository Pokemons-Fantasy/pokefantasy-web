type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

interface TierBadgeProps {
  tier?: Tier | null;
}

export default function TierBadge({ tier }: TierBadgeProps) {
  if (!tier) return null;
  return (
    <span className={`tier-badge tier-badge-${tier.toLowerCase()}`}>
      {tier}
    </span>
  );
}
