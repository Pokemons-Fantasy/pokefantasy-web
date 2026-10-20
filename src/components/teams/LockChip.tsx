/** "🔒 J3": un Pokémon recién robado, intercambiado o fichado sigue bloqueado hasta que termine esa jornada. */
export default function LockChip({ jornada }: { jornada: number | null | undefined }) {
  if (jornada == null) return null;
  const label = `Bloqueado hasta que termine la jornada ${jornada}`;
  return (
    <span className="lock-chip" title={label}>
      <span aria-hidden="true">🔒 </span>J{jornada}
      <span className="sr-only">{label}</span>
    </span>
  );
}
