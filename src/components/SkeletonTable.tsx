interface SkeletonTableProps {
  rows?: number;
}

export function SkeletonTable({ rows = 4 }: SkeletonTableProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', opacity: 1 - i * 0.1 }}
        >
          <div className="skeleton" style={{ height: '20px', flex: 2 }} />
          <div className="skeleton" style={{ height: '20px', flex: 1 }} />
        </div>
      ))}
    </div>
  );
}
