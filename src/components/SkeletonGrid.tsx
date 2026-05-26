interface SkeletonGridProps {
  count?: number;
  cardHeight?: string;
}

export function SkeletonGrid({ count = 6, cardHeight = '90px' }: SkeletonGridProps) {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: cardHeight, borderRadius: 'var(--radius)' }}
        />
      ))}
    </div>
  );
}
