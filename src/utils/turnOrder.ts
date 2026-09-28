/**
 * Orden de turnos del draft a partir del que ha colocado el admin y los miembros actuales: conserva el orden
 * colocado, quita a quien ya no está y añade al final, en el orden de la liga, a quien ha entrado después.
 */
export function syncTurnOrder(arranged: string[], members: string[]): string[] {
  const current = new Set(members);
  const kept = arranged.filter((u) => current.has(u));
  const placed = new Set(kept);
  return [...kept, ...members.filter((u) => !placed.has(u))];
}

/** Intercambia la posición `i` con la siguiente (`step` 1) o la anterior (`step` -1); fuera de rango, igual. */
export function moveTurn(order: string[], i: number, step: 1 | -1): string[] {
  const j = i + step;
  if (i < 0 || j < 0 || i >= order.length || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Fisher-Yates. `random` se inyecta para los tests. */
export function shuffleTurnOrder(order: string[], random: () => number = Math.random): string[] {
  const next = [...order];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
